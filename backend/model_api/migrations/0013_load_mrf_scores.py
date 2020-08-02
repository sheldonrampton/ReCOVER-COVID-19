# Generated by Django 3.0.4 on 2020-07-20 02:08

from django.db import migrations
import csv
import datetime

GLOBAL_MRF_SCORE_CSV_PATH = "../results/scores/global_MFR_num.csv"
GLOBAL_MRF_SCORE_CONF_CSV_PATH = "../results/scores/global_MFR_conf.csv"
US_MRF_SCORE_CSV_PATH = "../results/scores/us_MFR_num.csv"
US_MRF_SCORE_CONF_CSV_PATH = "../results/scores/us_MFR_conf.csv"

def load_mrf_score(apps, schema_editor):
    Area = apps.get_model('model_api', 'Area')
    MRFScoreDataPoint = apps.get_model('model_api', 'MRFScoreDataPoint')

    #country level
    with open (GLOBAL_MRF_SCORE_CSV_PATH) as f1, open (GLOBAL_MRF_SCORE_CONF_CSV_PATH) as f2:
        reader1 = csv.reader(f1)
        reader2 = csv.reader(f2)

        header = next(reader1, None)
        next(reader2, None)

        for row in reader1:
            conf_row = next(reader2, None)
            state = ""
            country = row[1]
            area = Area.objects.get(country=country, state=state)
            for i in range(2, len(header)):
                raw_date = header[i]
                date = datetime.datetime(*[int(item) for item in raw_date.split('-')])
                if row[i] == "NaN":
                    if i == 2:
                        val = 0
                        row[i] = 0
                    else:
                        val = row [i-1]
                        row[i] = row[i-1]
                else:
                    val = float(row[i])

                if conf_row[i] == "NaN":
                    conf = 0
                else:
                    conf = float(conf_row[i])

                mrf_score = MRFScoreDataPoint(
                    area = area,
                    date = date,
                    val = val,
                    conf = conf
                )
                mrf_score.save()

    #US level
    with open (US_MRF_SCORE_CSV_PATH) as f1, open (US_MRF_SCORE_CONF_CSV_PATH) as f2:
        reader1 = csv.reader(f1)
        reader2 = csv.reader(f2)

        header = next(reader1, None)
        next(reader2, None)

        for row in reader1:
            conf_row = next(reader2, None)
            state = row[1]
            country = "US"
            area = Area.objects.get(country=country, state=state)
            for i in range(2, len(header)):
                raw_date = header[i]
                date = datetime.datetime(*[int(item) for item in raw_date.split('-')])
                if row[i] == "NaN":
                    if i == 2:
                        val = 0
                        row[i] = 0
                    else:
                        val = row [i-1]
                        row[i] = row[i-1]
                else:
                    val = float(row[i])

                if conf_row[i] == "NaN":
                    conf = 0
                else:
                    conf = float(conf_row[i])

                mrf_score = MRFScoreDataPoint(
                    area = area,
                    date = date,
                    val = val,
                    conf = conf
                )
                mrf_score.save()



def delete_mrf_score(apps, schema_editor):
    Area = apps.get_model('model_api', 'Area')
    MRFScoreDataPoint = apps.get_model('model_api', 'MRFScoreDataPoint')
    Area.objects.all().delete()
    MRFScoreDataPoint.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('model_api', '0012_mrfscoredatapoint'),
    ]

    operations = [
        migrations.RunPython(load_mrf_score, delete_mrf_score),
    ]