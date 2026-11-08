# Late-delivery prediction problem definition

## Prediction point and unit

Predict at order placement, using one row per `Order Id`. The processed source has 65,752 orders and 180,519 item rows; 45,902 orders have multiple item rows. Delivery label, shipping method, actual/scheduled shipping days, order date, destination, and delivery status are internally consistent across every item row of an order in the current source.

## Recommended historical target

Use `Late_delivery_risk = 1` as the historical positive class after excluding `Shipping canceled` orders. It exactly matches `Delivery Status = Late delivery` in this processed CSV: 98,977 positive item rows. Negative class: non-canceled orders where the flag is zero. This is an outcome label, never a predictor.

The engineered comparison `Days for shipping (real) > Days for shipment (scheduled)` produces 103,400 positives (57.28%). Its additional 4,423 positives are canceled shipments. The outcome flag/status label produces 98,977 positives (54.83%) and has no discrepancies with delivery status.

## Cancellation handling

Exclude all 7,754 `Shipping canceled` rows/orders from the binary completed-delivery target. Of those rows, 4,423 satisfy the engineered actual-versus-scheduled rule and 3,331 do not. Canceled status is an outcome/process state and should not be presumed available at order placement.

## Feature availability audit

| Field | Decision | Rationale |
| --- | --- | --- |
| Shipping Mode, Market, Region, Country, Customer Segment, Category | Candidate | Operational or customer/order context; confirm source-system timing. |
| Order quantity, sales/order value, order month | Candidate | Aggregate to order level and confirm value/quantity availability at placement. |
| Scheduled shipping days | Conditional | Include only if promise is assigned at placement. |
| Late delivery risk, Delivery Status, actual shipping days | Exclude | Direct post-outcome leakage. |
| Order ID, Customer ID | Traceability only | Identifiers must not be model features. |

## Validation strategy

Use chronological order-date splits after order-level aggregation: earliest 70% train, next 15% validation, latest 15% test. Report class balance in every split. Do not fit learned preprocessing on validation/test rows. Repeated customers may create dependence; document this and consider a customer-group sensitivity analysis.
