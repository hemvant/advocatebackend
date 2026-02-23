let processStartTime = Date.now();

function setProcessStartTime() {
  processStartTime = Date.now();
}

function getProcessStartTime() {
  return processStartTime;
}

function getUptimeSeconds() {
  return Math.floor((Date.now() - processStartTime) / 1000);
}

module.exports = { setProcessStartTime, getProcessStartTime, getUptimeSeconds };
