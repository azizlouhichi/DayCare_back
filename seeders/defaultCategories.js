const mongoose = require('mongoose');
const Category = require('../models/category');
const Admin = require('../models/admin');
const SubCategory = require('../models/subCategory');

const defaultCategories = [
  {
    name: 'Plumber',
    description: 'Professional plumbing services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Enfant',
    description: 'Child care services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Electricité',
    description: 'Professional electrical services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Jardinage',
    description: 'Garden and landscaping services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'AC Repair',
    description: 'Air conditioning repair services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Painter',
    description: 'Professional painting services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Demenagement',
    description: 'Moving and relocation services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Bricolage',
    description: 'General home improvement services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Ménage',
    description: 'House cleaning services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  },
  {
    name: 'Kitchen',
    description: 'Meal preparation services',
    isDefault: true,
    isSubCategory: false,
    status: 'approved'
  }
];


const defaultSubCategories = {
  'Plumber': [
    { name: 'Pipe Repair', description: 'Repair and maintenance of pipes', isDefault: true },
    { name: 'Installation', description: 'Installation of plumbing fixtures', isDefault: true }
  ],
  'Enfant': [
    { name: 'Babysitting', description: 'Child care and supervision', isDefault: true },
    { name: 'Educational Activities', description: 'Learning and development activities', isDefault: true }
  ],
  'Electricité': [
    { name: 'Wiring', description: 'Electrical wiring installation and repair', isDefault: true },
    { name: 'Appliance Repair', description: 'Repair of electrical appliances', isDefault: true }
  ],
  'Jardinage': [
    { name: 'Lawn Care', description: 'Lawn maintenance and landscaping', isDefault: true },
    { name: 'Tree Service', description: 'Tree trimming and removal', isDefault: true }
  ],
  'AC Repair': [
    { name: 'Maintenance', description: 'Regular AC maintenance and cleaning', isDefault: true },
    { name: 'Installation', description: 'AC unit installation services', isDefault: true }
  ],
  'Painter': [
    { name: 'Interior', description: 'Interior painting services', isDefault: true },
    { name: 'Exterior', description: 'Exterior painting services', isDefault: true }
  ],
  'Demenagement': [
    { name: 'Local Moving', description: 'Local moving services', isDefault: true },
    { name: 'Packing', description: 'Professional packing services', isDefault: true }
  ],
  'Bricolage': [
    { name: 'Carpentry', description: 'Woodworking and furniture repair', isDefault: true },
    { name: 'General Repairs', description: 'Basic home repairs and maintenance', isDefault: true }
  ],
  'Ménage': [
    { name: 'Regular Cleaning', description: 'Regular house cleaning services', isDefault: true },
    { name: 'Deep Cleaning', description: 'Thorough deep cleaning services', isDefault: true }
  ],
  'Kitchen': [
    { name: 'Meal Prep', description: 'Meal preparation services', isDefault: true },
    { name: 'Cooking Classes', description: 'Cooking instruction and classes', isDefault: true }
  ]
};

const seedDefaultCategories = async () => {
  try {

    const existingCategoriesCount = await Category.countDocuments({ isDefault: true });


    if (existingCategoriesCount > 0) {
      console.log('Default categories already exist. Skipping category seeding.');
      return;
    }

    console.log('No default categories found. Starting category seeding...');


    let adminUser = await Admin.findOne({ email: 'admin@gmail.com' });
    if (!adminUser) {
      adminUser = new Admin({
        nom: 'Admin',
        prenom: 'User',
        email: 'admin@gmail.com',
        motDePasse: 'admin123',
        adresse: 'Admin Address',
        telephone: '12345678',
        role: 'Admin'
      });
      await adminUser.save();
      console.log('Created admin user');
    }


    const mainCategories = {};
    for (const categoryData of defaultCategories) {
      categoryData.createdBy = adminUser._id;
      const category = new Category(categoryData);
      await category.save();
      mainCategories[category.name] = category;
      console.log(`Created main category: ${category.name}`);


      const subCategories = defaultSubCategories[category.name];
      if (subCategories) {
        for (const subCatData of subCategories) {
          const subCategory = new SubCategory({
            ...subCatData,
            category: category._id,
            createdBy: adminUser._id
          });

          await subCategory.save();


          category.subCategories.push(subCategory._id);
          await category.save();

          console.log(`Created subcategory: ${subCategory.name} for ${category.name}`);
        }
      }
    }

    console.log('Default categories and subcategories seeding completed successfully');
  } catch (error) {
    console.error('Error seeding default categories:', error);
  }
};

module.exports = seedDefaultCategories;