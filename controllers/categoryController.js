const Service = require('../models/service');
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const Notification = require('../models/notification');
const io = require('../services/io').getIO();



exports. getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find( );
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports. getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find();
    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports. getAllCategoriesAndSubCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isSubCategory: false }).populate({
      path: 'subCategories',
      model: 'SubCategory'
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports. getServicesBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const services = await Service.find({ subCategory: subCategoryId });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

