"""Colab-compatible, non-modeling preparation workflow for DataCo late delivery."""
from pathlib import Path
import pandas as pd

SOURCE = Path('DataCo_Retail_Processed.csv')
OUTPUT = Path('prepared_late_delivery_orders.csv')
required = ['Order Id','Order Date','Late_delivery_risk','Delivery Status','Shipping Mode','Market','Order Region','Order Country','Customer Segment','Category Name','Order Item Quantity','Sales','Days for shipment (scheduled)']
df = pd.read_csv(SOURCE)
missing = sorted(set(required) - set(df.columns))
if missing:
    raise ValueError(f'Missing required columns: {missing}')

# Exclude canceled outcomes; retain identifiers solely for traceability.
df = df.loc[df['Delivery Status'].ne('Shipping canceled')].copy()
inconsistent = df.groupby('Order Id')['Late_delivery_risk'].nunique()
if (inconsistent > 1).any():
    raise ValueError('Contradictory order-level target values require investigation before aggregation.')

orders = df.groupby('Order Id', as_index=False).agg(
    order_date=('Order Date','first'), late_delivery=('Late_delivery_risk','first'),
    shipping_mode=('Shipping Mode','first'), market=('Market','first'), region=('Order Region','first'),
    country=('Order Country','first'), customer_segment=('Customer Segment','first'),
    category=('Category Name', lambda x: ' | '.join(sorted(set(x)))),
    quantity=('Order Item Quantity','sum'), order_value=('Sales','sum'),
    scheduled_shipping_days=('Days for shipment (scheduled)','first'),
)
orders['order_month'] = pd.to_datetime(orders['order_date'], errors='raise').dt.month
orders.to_csv(OUTPUT, index=False)
print({'orders': len(orders), 'late_rate': orders['late_delivery'].mean(), 'output': str(OUTPUT)})
