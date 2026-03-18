const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const Settings = require('../models/Settings');

// @desc    Get settings (create default if not exists)
// @route   GET /api/v1/settings
// @access  Protected
const getSettings = asyncHandler(async (req, res, next) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return successResponse(res, 200, 'Settings retrieved', settings);
});

// @desc    Update settings
// @route   PUT /api/v1/settings
// @access  Protected (admin)
const updateSettings = asyncHandler(async (req, res, next) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({ ...req.body, updatedBy: req.user._id });
  } else {
    Object.assign(settings, req.body);
    settings.updatedBy = req.user._id;
    await settings.save();
  }

  return successResponse(res, 200, 'Settings updated successfully', settings);
});

module.exports = { getSettings, updateSettings };
