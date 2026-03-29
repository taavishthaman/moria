const prisma = require("../lib/prisma");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await prisma.category.findMany();

  res.status(200).json({
    data: {
      categories,
    },
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await prisma.category.findUnique({
    where: {
      category_id: req.params.id,
    },
  });

  if (!category) {
    return res.status(404).json({
      status: "fail",
      message: "No category found with that Id",
    });
  }

  res.status(201).json({
    status: "success",
    data: {
      category,
    },
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await prisma.category.create({
    data: req.body,
  });

  res.status(201).json({
    data: {
      category,
    },
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const newCategory = await prisma.category.update({
    where: {
      category_id: req.params.id,
    },
    data: req.body,
  });

  if (!newCategory) {
    return res.status(404).json({
      message: "fail",
      data: "No category found with that Id",
    });
  }

  res.status(200).json({
    data: {
      category: newCategory,
    },
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  await prisma.category.delete({
    where: {
      category_id: req.params.id,
    },
  });

  res.status(404).json({
    status: "success",
    data: null,
  });
});
