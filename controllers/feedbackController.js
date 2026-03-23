const prisma = require("../lib/prisma");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllFeedbacks = async (req, res, next) => {
  const features = new APIFeatures(prisma.feedback, req.query, {})
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const feedbacks = await features.query;

  res.status(200).json({
    status: "success",
    results: feedbacks.length,
    data: {
      feedbacks,
    },
  });
};

exports.getFeedback = async (req, res, next) => {
  const feedback = await prisma.feedback.findUnique({
    where: {
      feedback_id: req.params.id,
    },
  });

  if (!feedback) {
    res.status(404).json({
      status: "fail",
      message: "No feedback found with that ID",
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback,
    },
  });
};

exports.createFeedback = async (req, res, next) => {
  const feedback = await prisma.feedback.create({ data: req.body });

  res.status(201).json({
    status: "success",
    data: {
      feedback,
    },
  });
};

exports.updateFeedback = async (req, res, next) => {
  const newFeedback = await prisma.feedback.update({
    where: {
      feedback_id: req.params.id,
    },
    data: req.body,
  });

  if (!newFeedback) {
    res.status(404).json({
      status: "fail",
      message: "No feedback found with that ID",
    });
  }

  res.status(200).json({
    message: "success",
    data: {
      feedback: newFeedback,
    },
  });
};

exports.deleteFeedback = async (req, res, next) => {
  await prisma.feedback.delete({
    where: {
      feedback_id: req.params.id,
    },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
};
