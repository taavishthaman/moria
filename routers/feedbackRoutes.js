const express = require("express");
const feedbackController = require("../controllers/feedbackController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .get(feedbackController.getAllFeedbacks)
  .post(feedbackController.createFeedback);

router
  .route("/:id")
  .get(feedbackController.getFeedback)
  .patch(feedbackController.updateFeedback)
  .delete(feedbackController.deleteFeedback);

router
  .route("/:id/comment")
  .get(feedbackController.getAllComments)
  .post(feedbackController.createComment);

router
  .route("/:id/upvote")
  .post(feedbackController.postUpvote)
  .delete(feedbackController.deleteUpvote);

module.exports = router;
