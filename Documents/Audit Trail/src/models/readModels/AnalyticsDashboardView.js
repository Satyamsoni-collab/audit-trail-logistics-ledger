import mongoose from 'mongoose';

/**
 * AnalyticsDashboardView Schema
 * 
 * Materialized View for real-time logistics & inventory dashboard reporting.
 * Updated reactively by the RealTimeAnalyticsProjector upon every relevant event.
 */
const analyticsDashboardViewSchema = new mongoose.Schema({
  metricKey: {
    type: String,
    required: true,
    unique: true,
    default: 'global_inventory_metrics'
  },
  totalItemsTracked: {
    type: Number,
    default: 0
  },
  totalUnitsInStock: {
    type: Number,
    default: 0
  },
  totalMovementsCount: {
    type: Number,
    default: 0
  },
  outOfStockItemsCount: {
    type: Number,
    default: 0
  },
  lastActivityTimestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('AnalyticsDashboardView', analyticsDashboardViewSchema);
