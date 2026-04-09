const prisma = require("../lib/prisma");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllFeedbacks = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(prisma.feedback, req.query, {})
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const feedbacks = await features.query;

  const feedbackIds = feedbacks.map((f) => f.feedback_id);
  const userUpvotes = await prisma.upvote.findMany({
    where: {
      user_id: req.user.user_id,
      feedback_id: { in: feedbackIds }, // Batch query
    },
  });

  const upvotedIds = new Set(userUpvotes.map((u) => u.feedback_id));

  const feedbacksWithUpvoteStatus = feedbacks.map((feedback) => ({
    ...feedback,
    has_user_upvoted: upvotedIds.has(feedback.feedback_id),
  }));

  res.status(200).json({
    status: "success",
    results: feedbacks.length,
    data: {
      feedbacks: feedbacksWithUpvoteStatus,
    },
  });
});

exports.getFeedback = catchAsync(async (req, res, next) => {
  const feedback = await prisma.feedback.findUnique({
    where: {
      feedback_id: req.params.id,
    },
  });

  if (!feedback) {
    return res.status(404).json({
      status: "fail",
      message: "No feedback found with that ID",
    });
  }

  const userUpvotes = await prisma.upvote.findFirst({
    where: {
      user_id: req.user.user_id,
      feedback_id: req.params.id,
    },
  });

  const feedbacksWithUpvoteStatus = [
    { ...feedback, has_user_upvoted: userUpvotes ? true : false },
  ];

  res.status(200).json({
    status: "success",
    data: {
      feedback: feedbacksWithUpvoteStatus,
    },
  });
});

exports.createFeedback = catchAsync(async (req, res, next) => {
  const feedback = await prisma.feedback.create({
    data: {
      ...req.body,
      user_id: req.user.user_id,
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      feedback,
    },
  });
});

exports.updateFeedback = catchAsync(async (req, res, next) => {
  const { category_id, ...restData } = req.body;

  const updateData = {
    ...restData,
    ...(category_id && {
      category: {
        connect: { category_id },
      },
    }),
  };
  const newFeedback = await prisma.feedback.update({
    where: {
      feedback_id: req.params.id,
    },
    data: updateData,
  });

  if (!newFeedback) {
    return res.status(404).json({
      status: "fail",
      message: "No feedback found with that ID",
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      feedback: newFeedback,
    },
  });
});

exports.deleteFeedback = catchAsync(async (req, res, next) => {
  await prisma.feedback.delete({
    where: {
      feedback_id: req.params.id,
    },
  });

  res.status(200).json({
    status: "success",
    data: null,
  });
});

exports.getAllComments = catchAsync(async (req, res, next) => {
  const feedbackId = req.params.id;

  const allComments = await prisma.comment.findMany({
    where: {
      feedback_id: feedbackId,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      comments: allComments,
    },
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  try {
    const { parentId, comment } = req.body;
    const feedbackId = req.params.id;

    const newComment = await prisma.comment.create({
      data: {
        comment,
        feedback_id: feedbackId,
        user_id: req.user.user_id,
        parent_comment_id: parentId || null,
        name: req.user.name || null,
        username: req.user.username || null,
        email: req.user.email,
      },
    });

    //Also increment the comment count by 1, because we need fast acceess to it
    await prisma.feedback.update({
      where: {
        feedback_id: feedbackId,
      },
      data: {
        comment_count: {
          increment: 1,
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        comment: newComment,
      },
    });
  } catch (error) {
    console.error("Comment creation error:", error); // ADD THIS
    throw error;
  }
});

exports.postUpvote = catchAsync(async (req, res, next) => {
  const feedbackId = req.params.id;

  //1) Create an upvote
  const newUpvote = await prisma.upvote.create({
    data: {
      feedback_id: feedbackId,
      user_id: req.user.user_id,
    },
  });

  //2) Increment upvote count in feedback by 1
  await prisma.feedback.update({
    where: {
      feedback_id: feedbackId,
    },
    data: {
      upvote_count: {
        increment: 1,
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      upvote: newUpvote,
    },
  });
});

exports.deleteUpvote = catchAsync(async (req, res, next) => {
  const feedbackId = req.params.id;

  //1) Create an upvote
  await prisma.upvote.delete({
    where: {
      upvote_id: {
        feedback_id: feedbackId,
        user_id: req.user.user_id,
      },
    },
  });

  //2) Increment upvote count in feedback by 1
  await prisma.feedback.update({
    where: {
      feedback_id: feedbackId,
    },
    data: {
      upvote_count: {
        decrement: 1,
      },
    },
  });

  res.status(200).json({
    status: "success",
    data: null,
  });
});
