(function (root) {
  'use strict';

  async function approveThenReward(approve, award, refresh) {
    await approve();

    var reward = null;
    var rewardError = null;
    try {
      if (award) reward = await award();
    } catch (error) {
      rewardError = error;
    }

    if (refresh) await refresh();
    return { approved: true, rewarded: !rewardError, reward: reward, rewardError: rewardError };
  }

  async function saveThenReward(save, award, onSaved) {
    var saved = await save();
    if (onSaved) await onSaved(saved);
    var reward = null;
    var rewardError = null;
    try {
      if (award) reward = await award();
    } catch (error) {
      rewardError = error;
    }
    if (!rewardError && reward && reward.ok === false) rewardError = reward.error || new Error('Reward is pending');
    return { saved: true, value: saved, rewarded: !rewardError, reward: reward, rewardError: rewardError };
  }

  async function redeemThenOpenForm(openWindow, redeem, makeUrl, fallback) {
    // Open synchronously before the first await so browsers retain user activation.
    var popup = openWindow ? openWindow() : null;
    try {
      var result = await redeem();
      var url = makeUrl(result);
      if (popup && !popup.closed) {
        try { popup.opener = null; } catch (error) {}
        popup.location.href = url;
        return { result: result, url: url, popupOpened: true };
      }
      if (fallback) await fallback(url);
      return { result: result, url: url, popupOpened: false };
    } catch (error) {
      if (popup && !popup.closed && typeof popup.close === 'function') popup.close();
      throw error;
    }
  }

  root.SecurePathFlows = {
    approveThenReward: approveThenReward,
    saveThenReward: saveThenReward,
    redeemThenOpenForm: redeemThenOpenForm
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
