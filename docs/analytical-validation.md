# Analytical validation

## Dataset characteristics

The processed CSV contains 180,519 transaction/order-item rows. It contains 65,752 distinct order IDs and 20,652 distinct customer IDs, so it must not be treated as an order-level dataset for rates or order counts without deliberate aggregation. The dashboard worker maps `Order Id`, `Customer Id`, `Sales`, `Order Profit Per Order`, quantity, delivery status, and the provided `Late_delivery_risk` field into its normalized row type.

## Verified headline KPIs

| Metric | Recalculated from processed CSV | Reference | Result |
| --- | ---: | ---: | --- |
| Total sales | $36,784,735.01 | $36,784,735.01 | Matches |
| Total profit | $3,966,902.97 | $3,966,902.97 | Matches |
| Unique orders | 65,752 | 65,752 | Matches |
| Unique customers | 20,652 | 20,652 | Matches |
| Total items sold | 384,079 | 384,079 | Matches |
| Average order value | $559.45 | $559.45 | Matches |
| Average profit per order | $60.33 | $60.33 | Matches |
| Overall profit margin | 10.78% | 10.78% | Matches |

Definitions: AOV is total sales divided by distinct order IDs. Average profit per order is total item-level profit divided by distinct order IDs. Overall margin is total profit divided by total sales, not an average of row margins.

## Late-delivery reconciliation

The processed dataset contains 98,977 rows with `Late_delivery_risk = 1` and 98,977 rows whose `Delivery Status` is `Late delivery`. The row-level definitions have zero disagreements in this CSV. The historical 57.28% / 103,400-record figure therefore cannot be reproduced from the processed source and should be treated as a result from another transformation, source version, or an independently calculated label.

The 54.83% late rate is item-row based: 98,977 / 180,519. It includes the dataset's current row population, which also contains 7,754 `Shipping canceled` rows. For order-level reporting or modeling, define a deterministic order-level label and document how mixed-status order items and canceled shipments are handled before training.

## Filter consistency

`Dashboard.tsx` derives a single filtered `rows` collection from year, market, region, segment, category, shipping mode, delivery status, order status, and product search. Headline KPIs and dashboard aggregations derive from that collection. Distinct order/customer KPIs are recalculated from the filtered item rows; this is valid as a selected-item interpretation, but a filter can include only part of an order, so it is not necessarily an order-level cohort.

## Modeling recommendation and leakage guardrails

Use an order-level historical late-delivery target derived from the supplied `Late_delivery_risk` / `Delivery Status` outcome, with explicitly documented cancellation treatment. Aggregate model inputs to one row per order. Do not use post-delivery fields such as actual shipping days, delivery status, or the late-delivery flag as predictors. Candidate pre-delivery fields require feature-availability review before approval.

## Limitations and next steps

No notebook or verified model/evaluation artifacts were available in the repository at validation time. Before predictive UI work, reconcile the historical 57.28% finding with its original notebook/source and establish an order-level target, split strategy, approved feature schema, and exported evaluation artifacts.
