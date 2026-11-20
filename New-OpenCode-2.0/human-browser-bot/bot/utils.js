// utils.js — Utility functions for the human browser bot

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const chance = (probability) => Math.random() < probability;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const humanPause = async (page, minMs, maxMs, options = {}) => {
  const total = rand(minMs, maxMs);
  if (!page || total < 500) {
    await sleep(total);
    return;
  }
  const started = Date.now();
  while (Date.now() - started < total) {
    const remaining = total - (Date.now() - started);
    const chunk = Math.min(rand(300, 1200), remaining);
    await sleep(chunk);
  }
};

module.exports = {
  rand,
  randFloat,
  sleep,
  chance,
  clamp,
  randomInt,
  humanPause,
};
