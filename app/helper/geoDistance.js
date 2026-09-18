// helper/geoDistance.js
// Haversine formula — do lat/long points ke beech distance meters me nikalta hai

/**
 * @param {number} lat1 - point 1 latitude
 * @param {number} lon1 - point 1 longitude
 * @param {number} lat2 - point 2 latitude
 * @param {number} lon2 - point 2 longitude
 * @returns {number} distance in meters
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
};

/**
 * @param {object} companyLocation - { latitude, longitude }
 * @param {object} employeeLocation - { latitude, longitude }
 * @param {number} allowedRadiusMeters - default 100
 * @returns {{ withinRange: boolean, distance: number }}
 */
const isWithinAllowedRadius = (
  companyLocation,
  employeeLocation,
  allowedRadiusMeters = 100
) => {
  const distance = getDistanceInMeters(
    Number(companyLocation.latitude),
    Number(companyLocation.longitude),
    Number(employeeLocation.latitude),
    Number(employeeLocation.longitude)
  );

  return {
    withinRange: distance <= allowedRadiusMeters,
    distance,
  };
};

module.exports = {
  getDistanceInMeters,
  isWithinAllowedRadius,
};