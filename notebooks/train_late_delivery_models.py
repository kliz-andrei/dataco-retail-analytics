from pathlib import Path
import json, joblib, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score,precision_score,recall_score,f1_score,roc_auc_score,average_precision_score,confusion_matrix

df=pd.read_csv('prepared_late_delivery_orders.csv',parse_dates=['order_date']).sort_values(['order_date','Order Id'],kind='stable').reset_index(drop=True)
features=['shipping_mode','market','region','country','customer_segment','category','quantity','order_value','order_month']; target='late_delivery'
n=len(df); a,b=int(n*.7),int(n*.85); train,val,test=df.iloc[:a],df.iloc[a:b],df.iloc[b:]
cat=features[:6]; num=features[6:]; pre=ColumnTransformer([('cat',Pipeline([('impute',SimpleImputer(strategy='most_frequent')),('onehot',OneHotEncoder(handle_unknown='ignore'))]),cat),('num',Pipeline([('impute',SimpleImputer(strategy='median')),('scale',StandardScaler())]),num)])
models={'dummy':DummyClassifier(strategy='most_frequent'),'logistic':LogisticRegression(max_iter=1000,random_state=42),'tree':DecisionTreeClassifier(max_depth=12,min_samples_leaf=30,random_state=42),'forest':RandomForestClassifier(n_estimators=150,min_samples_leaf=15,n_jobs=-1,random_state=42)}
def metrics(model,x,y,t=.5):
 p=model.predict_proba(x)[:,1]; z=p>=t; return {'accuracy':accuracy_score(y,z),'precision':precision_score(y,z,zero_division=0),'recall':recall_score(y,z,zero_division=0),'f1':f1_score(y,z,zero_division=0),'roc_auc':roc_auc_score(y,p),'average_precision':average_precision_score(y,p),'confusion_matrix':confusion_matrix(y,z).tolist()}
out=Path('artifacts/late_delivery_v1');out.mkdir(parents=True,exist_ok=True); results={}; fitted={}
for name,model in models.items():
 pipe=Pipeline([('preprocess',pre),('model',model)]);pipe.fit(train[features],train[target]);fitted[name]=pipe;results[name]=metrics(pipe,val[features],val[target])
best=max(['logistic','tree','forest'],key=lambda x:results[x]['f1']); thresholds=[.3,.4,.5,.6,.7]; chosen=max(thresholds,key=lambda t:metrics(fitted[best],val[features],val[target],t)['f1']); final=metrics(fitted[best],test[features],test[target],chosen)
joblib.dump(fitted[best],out/'pipeline.joblib');pd.DataFrame([{'model':k,**v} for k,v in results.items()]).to_csv(out/'validation_comparison.csv',index=False);p=fitted[best].predict_proba(test[features])[:,1];pd.DataFrame({'Order Id':test['Order Id'],'actual':test[target],'probability':p,'predicted':p>=chosen}).to_csv(out/'test_predictions.csv',index=False)
meta={'features':features,'selected_model':best,'threshold':chosen,'splits':{k:{'rows':len(v),'late_rate':float(v[target].mean()),'start':str(v.order_date.min().date()),'end':str(v.order_date.max().date())} for k,v in {'train':train,'validation':val,'test':test}.items()},'validation':results,'test':final};(out/'metadata.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta,indent=2))
