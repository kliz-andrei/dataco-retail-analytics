import json, joblib, pandas as pd
from pathlib import Path
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, brier_score_loss, log_loss

df=pd.read_csv('prepared_late_delivery_orders.csv',parse_dates=['order_date']).sort_values(['order_date','Order Id'],kind='stable').reset_index(drop=True)
features=['shipping_mode','market','region','country','customer_segment','category','quantity','order_value','order_month']; n=len(df); validation=df.iloc[int(n*.7):int(n*.85)]
pipe=joblib.load('artifacts/late_delivery_v1/pipeline.joblib'); y=validation.late_delivery; p=pipe.predict_proba(validation[features])[:,1]; rows=[]
for t in [round(x/100,2) for x in range(5,96,5)]:
 z=p>=t; tn,fp,fn,tp=confusion_matrix(y,z,labels=[0,1]).ravel(); rows.append({'threshold':t,'precision':precision_score(y,z,zero_division=0),'recall':recall_score(y,z,zero_division=0),'f1':f1_score(y,z,zero_division=0),'specificity':tn/(tn+fp),'fpr':fp/(tn+fp),'fnr':fn/(fn+tp),'alert_rate':z.mean(),'flagged_orders':int(z.sum()),'tn':tn,'fp':fp,'fn':fn,'tp':tp})
table=pd.DataFrame(rows); eligible=table.query('alert_rate >= .10 and alert_rate <= .70 and precision >= .70'); chosen=eligible.loc[eligible.f1.idxmax()]; out=Path('artifacts/late_delivery_v2');out.mkdir(parents=True,exist_ok=True);table.to_csv(out/'validation_threshold_analysis.csv',index=False);meta={'policy':'maximize validation F1 subject to precision >= 0.70 and alert rate 10%-70%; provisional analytical assumption','threshold':float(chosen.threshold),'validation':chosen.to_dict(),'brier_score':brier_score_loss(y,p),'log_loss':log_loss(y,p)};(out/'threshold_metadata.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta,indent=2))
