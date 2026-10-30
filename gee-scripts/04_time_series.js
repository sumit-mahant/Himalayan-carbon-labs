// ============================================
// HIMALAYA CARBON LABS — SCRIPT 04
// Multi-Year NDVI Time Series (2015-2026)
// ============================================
// PURPOSE:
//   Prove ADDITIONALITY for Verra/Gold Standard.
//   Show forest health trend over 12 years.
//   If declining → project is additional.
// USAGE:
//   Paste → Run → Read chart + console
// OUTPUT:
//   Line chart + additionality proof + export
// ============================================

var pilot = ee.Geometry.Rectangle([78.40, 30.70, 78.55, 30.80]);
Map.centerObject(pilot, 12);

// 1. CONFIGURATION
var START_YEAR = 2015;
var END_YEAR = 2026;

// 2. FUNCTION: Annual NDVI
function annualNDVI(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');
 
  // Try Sentinel-2 (2015+)
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(pilot)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
 
  // Fallback to Landsat 8
  var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(pilot)
    .filterDate(start, end);
 
  var image = ee.Image(ee.Algorithms.If(
    s2.size().gt(0), s2.median(), landsat.median()
  )).clip(pilot);
 
  return image.normalizedDifference(['B8', 'B4']).rename('NDVI');
}

// 3. BUILD SERIES
var years = ee.List.sequence(START_YEAR, END_YEAR);
var series = years.map(function(y) {
  var ndvi = annualNDVI(y);
  var stats = ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: pilot,
    scale: 30,
    maxPixels: 1e9
  });
  return ee.Feature(null, {
    'year': y,
    'ndvi': stats.get('NDVI')
  });
});

var fc = ee.FeatureCollection(series);

// 4. PRINT TABLE
print('═══════════════════════════════');
print('ANNUAL NDVI TIME SERIES');
print('═══════════════════════════════');
print(fc);

// 5. CHART
var chart = ui.Chart.feature.byFeature(fc, 'year', 'ndvi')
  .setChartType('LineChart')
  .setOptions({
    title: 'Forest Health Trend — Uttarkashi (2015–2026)',
    hAxis: {title: 'Year', format: '####'},
    vAxis: {title: 'Mean NDVI'},
    colors: ['#1a5f2a'],
    pointSize: 6,
    lineWidth: 3,
    curveType: 'function'
  });
print(chart);

// 6. ADDITIONALITY ANALYSIS
var sorted = fc.sort('year');
var first = ee.Number(sorted.first().get('ndvi'));
var last = ee.Number(sorted.sort('year', false).first().get('ndvi'));
var delta = last.subtract(first);
var percentChange = delta.divide(first).multiply(100);

print('═══════════════════════════════');
print('ADDITIONALITY PROOF');
print('═══════════════════════════════');
print('NDVI 2015:', first);
print('NDVI 2026:', last);
print('Change:', delta);
print('Change %:', percentChange);
print('───────────────────────────────');

// Logic: if change < -5% → declining → additionality strong
var additionalityVerdict = ee.Algorithms.If(
  percentChange.lt(-5),
  '✅ STRONG ADDITIONALITY — Forest declining, project prevents loss',
  ee.Algorithms.If(
    percentChange.lt(5),
    '⚠️ MODERATE ADDITIONALITY — Forest stable, project maintains status quo',
    '❌ WEAK ADDITIONALITY — Forest improving naturally, need stronger justification'
  )
);
print('VERDICT:', additionalityVerdict);

// 7. EXPORT
Export.table.toDrive({
  collection: fc,
  description: 'NDVI_TimeSeries_Uttarkashi_2015_2026',
  folder: 'HimalayaCarbon/TimeSeries',
  fileFormat: 'CSV'
});

Export.image.toDrive({
  image: annualNDVI(2026),
  description: 'NDVI_2026_Uttarkashi',
  folder: 'HimalayaCarbon/TimeSeries',
  region: pilot,
  scale: 10,
  maxPixels: 1e13
});