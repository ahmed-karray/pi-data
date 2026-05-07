# Alerting Guide

This project can surface high-attack-rate alerts from Elasticsearch into the Scientist and Admin UIs through `monitoring_service`.

## Watcher Rule

Create an Elasticsearch Watcher that evaluates the last 5 minutes of prediction traffic in the `6g-ids-predictions-*` indices. Trigger when the attack rate is greater than `80%`.

Suggested aggregation logic:

1. Filter documents from the last 5 minutes.
2. Count all prediction documents.
3. Count documents where `is_attack == true`.
4. Compute `attack_rate = attacks / total * 100`.
5. Trigger when `attack_rate > 80`.

## Webhook Action

Configure the Watcher action to `POST` a JSON payload to:

`http://monitoring_service:8004/monitor/alert`

Suggested payload:

```json
{
  "title": "High attack rate detected",
  "attack_rate": 84.2,
  "window_minutes": 5,
  "threshold": 80
}
```

## UI Handling

`monitoring_service` accepts the webhook and emits a `6g-ids-system` event. The Scientist and Admin UIs can poll or subscribe to the monitoring endpoints and surface a toast such as:

`High attack rate detected`

## Kibana Notes

- Build the Watcher against `6g-ids-predictions-*`.
- Use `@timestamp` as the time field.
- Create a companion TSVB chart using `avg(rolling_accuracy_pct)` to visualize rolling accuracy over time.
