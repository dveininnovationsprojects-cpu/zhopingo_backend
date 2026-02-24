


// const Category = require('../models/Category');
// const SubCategory = require('../models/SubCategory');
// const HsnMaster = require('../models/HsnMaster');

// // ================= 🌟 HSN MASTER FEATURES =================
// exports.addHsnCode = async (req, res) => {
//     try {
//         const hsn = new HsnMaster(req.body);
//         await hsn.save();
//         res.status(201).json({ success: true, data: hsn });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// exports.getAllHsnForAdmin = async (req, res) => {
//     try {
//         const list = await HsnMaster.find(); 
//         res.json({ success: true, data: list });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.getActiveHsnOnly = async (req, res) => {
//     try {
//         const list = await HsnMaster.find({ status: { $ne: false } }); 
//         res.json({ success: true, data: list });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.deleteHsnCode = async (req, res) => {
//     try {
//         await HsnMaster.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: "HSN Code deleted successfully" });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// exports.updateHsnStatus = async (req, res) => {
//     try {
//         const { status } = req.body;
//         const hsn = await HsnMaster.findByIdAndUpdate(req.params.id, { status }, { new: true });
//         res.json({ success: true, data: hsn });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// // ================= 🌟 UPDATE HSN CODE =================
// exports.updateHsnCode = async (req, res) => {
//     try {
//         const { hsnCode, description, gstRate, status } = req.body;
        
//         const hsn = await HsnMaster.findByIdAndUpdate(
//             req.params.id, 
//             { hsnCode, description, gstRate, status }, 
//             { new: true, runValidators: true }
//         );

//         if (!hsn) {
//             return res.status(404).json({ success: false, message: "HSN Code not found" });
//         }

//         res.json({ success: true, message: "HSN Code updated successfully", data: hsn });
//     } catch (err) { 
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };

// // ================= 🌟 CATEGORY FEATURES =================
// exports.createCategory = async (req, res) => {
//   try {
//     const { name, description, hsnCode, gstRate, isPermanent, iconName } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ error: "Image upload failed" });
//     }

//     const category = new Category({
//       name,
//       description,
//       hsnCode,
//       gstRate,
//       image: `categories/${req.file.filename}`,
//       isActive: true,
//       isPermanent: isPermanent === 'true' || isPermanent === true,
//       iconName: iconName || 'apps'
//     });

//     await category.save();
//     res.status(201).json({ success: true, data: category });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// exports.getPermanentCategories = async (req, res) => {
//     try {
//         const permanentCats = await Category.find({ isPermanent: true, isActive: true });
//         res.json({ success: true, data: permanentCats });
//     } catch (err) { 
//         res.status(500).json({ error: err.message }); 
//     }
// };

// exports.getCategories = async (req, res) => {
//     try {
//         const cats = await Category.find();
//         res.json({ success: true, data: cats });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.updateCategory = async (req, res) => {
//     try {
//         const updateData = { ...req.body };
//         if (req.file) updateData.image = `categories/${req.file.filename}`;
        
//         // 1. முதலில் Category-யை அப்டேட் செய்கிறோம்
//         const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });

//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found" });
//         }

//         // 🌟 2. மிக முக்கியம்: Category-ல் HSN அல்லது GST மாறினால், 
//         // அதன் கீழ் உள்ள எல்லா Sub-Categories-க்கும் அப்டேட் செய்கிறோம்
//         if (req.body.hsnCode || req.body.gstRate) {
//             await SubCategory.updateMany(
//                 { category: req.params.id },
//                 { 
//                     $set: { 
//                         hsnCode: category.hsnCode, 
//                         gstRate: category.gstRate 
//                     } 
//                 }
//             );
//             console.log(`Updated HSN for Sub-categories under ${category.name}`);
//         }

//         res.json({ success: true, message: "Category and Sub-categories updated", data: category });
//     } catch (err) { 
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };

// exports.deleteCategory = async (req, res) => {
//     try {
//         await Category.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: "Category deleted" });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// // ================= 🌟 SUB-CATEGORY FEATURES =================
// exports.createSubCategory = async (req, res) => {
//     try {
//         const { name, category, description } = req.body;
//         const parent = await Category.findById(category);
//         if (!parent) return res.status(404).json({ error: "Category not found" });

//         const subCat = new SubCategory({ 
//             name, category, description,
//             hsnCode: parent.hsnCode,
//             gstRate: parent.gstRate,
//             image: req.file ? `categories/${req.file.filename}` : null 
//         });
//         await subCat.save();
//         res.status(201).json({ success: true, data: subCat });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// exports.getAllSubCategories = async (req, res) => {
//     try {
//         const subs = await SubCategory.find().populate('category');
//         res.json({ success: true, data: subs });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.getSubsByCategory = async (req, res) => {
//     try {
//         const subs = await SubCategory.find({ category: req.params.catId }).populate('category');
//         res.json({ success: true, data: subs });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.updateSubCategory = async (req, res) => {
//     try {
//         const updateData = { ...req.body };
//         if (req.file) updateData.image = `categories/${req.file.filename}`;
//         const sub = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');
//         res.json({ success: true, data: sub });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };

// exports.deleteSubCategory = async (req, res) => {
//     try {
//         await SubCategory.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: "Sub-category deleted" });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };


const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const HsnMaster = require('../models/HsnMaster');

// ================= 🌟 HSN MASTER FEATURES =================
exports.addHsnCode = async (req, res) => {
    try {
        const hsn = new HsnMaster(req.body);
        await hsn.save();
        res.status(201).json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllHsnForAdmin = async (req, res) => {
    try {
        const list = await HsnMaster.find(); 
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getActiveHsnOnly = async (req, res) => {
    try {
        const list = await HsnMaster.find({ status: { $ne: false } }); 
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteHsnCode = async (req, res) => {
    try {
        await HsnMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "HSN Code deleted successfully" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateHsnStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const hsn = await HsnMaster.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateHsnCode = async (req, res) => {
    try {
        const { hsnCode, description, gstRate, status } = req.body;
        const hsn = await HsnMaster.findByIdAndUpdate(
            req.params.id, 
            { hsnCode, description, gstRate, status }, 
            { new: true, runValidators: true }
        );
        if (!hsn) return res.status(404).json({ success: false, message: "HSN Code not found" });
        res.json({ success: true, message: "HSN Code updated successfully", data: hsn });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// ================= 🌟 CATEGORY FEATURES =================
exports.createCategory = async (req, res) => {
  try {
    const { name, description, hsnCode, gstRate, isPermanent, iconName } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image upload failed" });
    }

    // 🌟 S3 Storage: Save the key directly
    const category = new Category({
      name,
      description,
      hsnCode,
      gstRate,
      image: req.file.key, // 🔥 Use S3 key (e.g., categories/123.jpg)
      isActive: true,
      isPermanent: isPermanent === 'true' || isPermanent === true,
      iconName: iconName || 'apps'
    });

    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const cats = await Category.find().lean();
        
        // 🌟 Retrieval logic with CloudFront
        const data = cats.map(cat => ({
            ...cat,
            image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPermanentCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const permanentCats = await Category.find({ isPermanent: true, isActive: true }).lean();
        
        const data = permanentCats.map(cat => ({
            ...cat,
            image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        // 🌟 If new image uploaded, use S3 key
        if (req.file) updateData.image = req.file.key;
        
        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!category) return res.status(404).json({ success: false, message: "Category not found" });

        // 🌟 Sub-category inheritance remains untouched
        if (req.body.hsnCode || req.body.gstRate) {
            await SubCategory.updateMany(
                { category: req.params.id },
                { $set: { hsnCode: category.hsnCode, gstRate: category.gstRate } }
            );
        }

        res.json({ success: true, message: "Category and Sub-categories updated", data: category });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteCategory = async (req, res) => {
    try {
        // 🌟 Optional Senior Peer Logic: S3 Cleanup pannanum-na inga s3.deleteObject call panna mudiyum
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 SUB-CATEGORY FEATURES =================
exports.createSubCategory = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const parent = await Category.findById(category);
        if (!parent) return res.status(404).json({ error: "Category not found" });

        const subCat = new SubCategory({ 
            name, category, description,
            hsnCode: parent.hsnCode,
            gstRate: parent.gstRate,
            image: req.file ? req.file.key : null // 🔥 Use S3 key
        });
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllSubCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find().populate('category').lean();
        
        const data = subs.map(sub => ({
            ...sub,
            image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSubsByCategory = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find({ category: req.params.catId }).populate('category').lean();
        
        const data = subs.map(sub => ({
            ...sub,
            image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.key;
        
        const sub = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');
        res.json({ success: true, data: sub });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        await SubCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Sub-category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};