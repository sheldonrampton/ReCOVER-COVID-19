import React, { Component } from "react";
import { ResponsiveLine } from "@nivo/line";
import moment from "moment";
import numeral from "numeral";
import {
  red,
  gold,
  lime,
  cyan,
  geekblue,
  purple,
  magenta
} from "@ant-design/colors";

function getLineColor(index) {
  const colors = [
    red.primary,
    gold.primary,
    lime.primary,
    cyan.primary,
    geekblue.primary,
    purple.primary,
    magenta.primary
  ];

  return colors[index % colors.length];
}

// Custom layer for Nivo Line that allows us to display predictions as dashed
// lines.
const DashedLine = ({ series, lineGenerator, xScale, yScale }) => {
  return series.map(({ id, data, color, predicted, distancing }) => {
    let style = {
      strokeWidth: 3
    };

    // Add custom style if predicted.
    if (predicted) {
      if (distancing) {
        style.strokeDasharray = "6, 4";
      } else {
        // Display a sparser pattern for no social distancing.
        style.strokeDasharray = "2, 6";
      }
    }

    return (
      <path
        key={id}
        d={lineGenerator(
          data.map(d => ({
            x: xScale(d.data.x),
            y: yScale(d.data.y)
          }))
        )}
        fill="none"
        stroke={color}
        style={style}
      />
    );
  });
};

class Covid19Graph extends Component {
  parseDate(dateStr) {
    let [year, month, day] = dateStr.split("-").map(Number);
    // Month in JS is 0-based.
    month -= 1;
    return new Date(year, month, day);
  }

  /**
   * Given a time series returned by the predict endpoint, getCumulativeData
   * returns it in Nivo format.
   */
  getCumulativeData(data) {
    return data.map(d => ({
      x: this.parseDate(d.date),
      y: d.value
    }));
  }

  /**
   * Given a time series returned by the predict endpoint, getDeltaData returns
   * the adjacent difference of the timeseries, in Nivo format.
   * @param initialVal - The initial value that is subtracted from the 1st
   *  element.
   */
  getDeltaData(data, initialVal) {
    return data.map((d, i) => {
      if (i === 0) {
        return {
          x: this.parseDate(d.date),
          y: d.value - initialVal
        };
      }

      return {
        x: this.parseDate(d.date),
        y: d.value - data[i - 1].value
      };
    });
  }

  // processData properly formats the given data, and performs special
  // operations based on parameter values.
  processData(data, params) {
    const { statistic, yScale, initialVal } = params;

    // Determine whether we need to calculate deltas between points.
    let retData =
      statistic === "delta"
        ? this.getDeltaData(data, initialVal)
        : this.getCumulativeData(data);

    // Remove all points with y = 0 if we're using log scale, otherwise it will
    // break.
    if (yScale === "log") {
      retData = retData.filter(({ x, y }) => y > 0);
    }

    return retData;
  }

  render() {
    let { data } = this.props;
    const { statistic, yScale } = this.props;

    // chartData contains the data that we will pass into Nivo line chart.
    let chartData = [];
    // colors holds hex values for each line in the chart.
    let colors = [];

    // Sort the data by area name (so we have a consistent coloring) and then
    // loop over each area.
    Object.keys(data)
      .sort()
      .forEach((area, idx) => {
        const lineColor = getLineColor(idx);

        const observedData = data[area].observed;

        // Add the observed infection data.
        chartData.push({
          id: area,
          data: this.processData(observedData, {
            statistic: statistic,
            yScale: yScale,
            initialVal: 0
          }),
          // 'predicted' is a custom prop that we add so later we can tell the
          // difference between observed/predicted data when drawing the lines.
          predicted: false
        });

        colors.push(lineColor);

        // Add the data for each of the predicted time series. Filter out time
        // series that don't have any data associated.
        data[area].predictions
          .filter(p => p.time_series.length > 0)
          .forEach(p => {
            const modelName = p.model_name;
            const distancing = p.distancing;
            const timeSeries = p.time_series;

            chartData.push({
              id: `${area} (${p.model_name}, distancing=${distancing})`,
              // If we're displaying deltas, we pass in the last observed value as
              // the initial value for calculating the predicted deltas.
              data: this.processData(timeSeries, {
                statistic: statistic,
                yScale: yScale,
                initialVal: observedData[observedData.length - 1].value
              }),
              // 'predicted' is a custom prop that we add so later we can tell the
              // difference between observed/predicted data when drawing the lines.
              predicted: true,
              // 'distancing' is also a custom prop we add so we can draw the
              // line patterns differently between yes/no social distancing.
              distancing: distancing
            });

            colors.push(lineColor);
          });
      });

    return (
      <ResponsiveLine
        data={chartData}
        colors={colors}
        margin={{ top: 50, right: 50, bottom: 50, left: 60 }}
        xScale={{
          type: "time",
          format: "native",
          precision: "day"
        }}
        yScale={{
          type: yScale,
          base: 10,
          min: "auto",
          max: "auto"
        }}
        axisBottom={{
          // tickValues determines how often / with what values our 'format'
          // func is called.
          tickValues: "every week",
          // A custom 'format' func is required since all the x values are
          // javascript Date objects.
          format: date => {
            return moment(date).format("M/D");
          },
          orient: "bottom",
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Date",
          legendOffset: 36,
          legendPosition: "middle"
        }}
        axisLeft={{
          // Format large y numbers as their abbreviations.
          format: y => numeral(y).format("0.[0]a"),
          orient: "left",
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: statistic === "delta" ? "New Cases" : "Cumulative Cases",
          legendOffset: -40,
          legendPosition: "middle"
        }}
        enableSlices="x"
        sliceTooltip={({ slice }) => {
          return (
            <div
              style={{
                background: "white",
                padding: "9px 12px",
                border: "1px solid #ccc"
              }}
            >
              <div>
                {// Grab the date from the first point, this will be the title of
                // the tooltip.
                moment(slice.points[0].data.x).format("MMM Do YYYY")}
              </div>
              {slice.points.map(point => (
                <div
                  key={point.id}
                  style={{
                    color: point.serieColor,
                    padding: "3px 0"
                  }}
                >
                  <strong>{point.serieId}</strong>[
                  {numeral(point.data.yFormatted).format("0.[0]a")}]
                </div>
              ))}
            </div>
          );
        }}
        pointSize={0}
        pointLabel="y"
        pointLabelYOffset={-12}
        legends={[
          {
            anchor: "top-left",
            direction: "column",
            justify: false,
            translateX: 0,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: "left-to-right",
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)",
            effects: [
              {
                on: "hover",
                style: {
                  itemBackground: "rgba(0, 0, 0, .03)",
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        layers={[
          "grid",
          "markers",
          "areas",
          "crosshair",
          DashedLine,
          "slices",
          "points",
          "axes",
          "legends"
        ]}
      />
    );
  }
}

export default Covid19Graph;
