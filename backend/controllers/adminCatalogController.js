const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const MasterProduct = require('../models/MasterProduct'); 
const Product = require('../models/Product'); 
const HsnMaster = require('../models/HsnMaster');
const { s3 } = require('../middleware/multerConfig');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// ================= 🌟 HSN MASTER (CRUD) =================
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

exports.updateHsnCode = async (req, res) => {
    try {
        const hsn = await HsnMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteHsnCode = async (req, res) => {
    try {
        await HsnMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "HSN Code deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};
// 🌟 1. CREATE: Normal Image or Permanent Icon upload
exports.createCategory = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File upload failed" });

    const category = new Category({ 
        ...req.body, 
        image: req.file.key, 
        isActive: true,
        // Frontend "true" string-ah anuppunaalum handle aagum
        isPermanent: req.body.isPermanent === 'true' || req.body.isPermanent === true 
    });

    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// 🌟 2. TOP BAR: Fetch only Permanent Icons
exports.getPermanentCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const cats = await Category.find({ isPermanent: true }).lean();
        
        const data = cats.map(cat => ({
            ...cat,
            image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.getCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        // Inga normal categories (isPermanent: false) mattum fetch pannuvom
        const cats = await Category.find({ isPermanent: { $ne: true } }).lean();
        
        const data = cats.map(cat => ({
            ...cat,
            image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // 🌟 1. Icon or Image update panna andha key-ah update pannuvom
        if (req.file) {
            updateData.image = req.file.key;
        }

        // 🌟 2. Boolean Handling: Frontend-la irundhu string-ah vandhaalum handle pannanum
        if (updateData.isPermanent !== undefined) {
            updateData.isPermanent = updateData.isPermanent === 'true' || updateData.isPermanent === true;
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true } // Latest updated data-va return pannum
        );

        if (!category) return res.status(404).json({ success: false, message: "Category not found" });

        res.json({ success: true, message: "Category updated successfully!", data: category });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 SUB-CATEGORY =================
exports.createSubCategory = async (req, res) => {
    try {
        const subCat = new SubCategory({ ...req.body, image: req.file ? req.file.key : null });
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllSubCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find().populate('category').lean();
        const data = subs.map(sub => ({
            ...sub, image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSubsByCategory = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find({ category: req.params.catId }).lean();
        const data = subs.map(sub => ({
            ...sub, image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.key;
        const sub = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: sub });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        await SubCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Sub-category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 MASTER PRODUCT LIST (HSN Mapping ONLY here) =================
exports.addMasterProduct = async (req, res) => {
    try {
        const { name, category, subCategory, hsnMasterId } = req.body;
        const newEntry = new MasterProduct({
            name, 
            category, 
            subCategory, 
            hsnMasterId,
            // 🌟 Image key handling added
            image: req.file ? req.file.key : "", 
            isApproved: true, 
            status: 'active'
        });
        await newEntry.save();
        res.status(201).json({ success: true, message: "Catalog updated!", data: newEntry });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getMasterListBySubCategory = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const list = await MasterProduct.find({ subCategory: req.params.subCatId })
            .populate('hsnMasterId') 
            .lean();

        // 🌟 Adding CloudFront URL for Master Product images
        const data = list.map(item => ({
            ...item,
            image: item.image ? (item.image.startsWith('http') ? item.image : CF_URL + item.image) : ""
        }));

        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateMasterProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // 🌟 Handle image update
        if (req.file) updateData.image = req.file.key;

        const updatedMaster = await MasterProduct.findByIdAndUpdate(id, updateData, { new: true }).populate('hsnMasterId');
        
        if (!updatedMaster) {
            return res.status(404).json({ success: false, message: "Master Product not found" });
        }

        // SYNC LOGIC with all Seller Inventories
        let inventoryUpdate = {};
        if (updateData.name) inventoryUpdate.name = updatedMaster.name;
        
        if (updateData.hsnMasterId) {
            inventoryUpdate.hsnCode = updatedMaster.hsnMasterId.hsnCode;
            inventoryUpdate.gstPercentage = updatedMaster.hsnMasterId.gstRate;
        }

        if (Object.keys(inventoryUpdate).length > 0) {
            await Product.updateMany(
                { masterProductId: id }, 
                { $set: inventoryUpdate }
            );
        }

        res.json({ 
            success: true, 
            message: "Master Catalog updated and synced!", 
            data: updatedMaster 
        });
    } catch (err) { res.status(400).json({ success: false, error: "Update Error: " + err.message }); }
};

exports.deleteMasterProduct = async (req, res) => {
    try {
        await MasterProduct.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Removed from Catalog" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// 🌟 Admin dashboard-kkaga full Master Product list fetch pandradhu
exports.getAllMasterProducts = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const list = await MasterProduct.find()
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .populate('hsnMasterId', 'hsnCode gstRate')
            .sort({ createdAt: -1 })
            .lean();

        // 🌟 Image path correction for full list
        const data = list.map(item => ({
            ...item,
            image: item.image ? (item.image.startsWith('http') ? item.image : CF_URL + item.image) : ""
        }));

        res.json({ success: true, count: data.length, data });
    } catch (err) { res.status(500).json({ success: false, error: "Fetch Error: " + err.message }); }
};

// ================= 🌟 TOKENS / SELLER REQUESTS =================
exports.approveProductToken = async (req, res) => {
    try {
        const { productId } = req.body; 
        if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

        const requestProduct = await MasterProduct.findById(productId.trim());
        if (!requestProduct) return res.status(404).json({ success: false, message: "Request record not found" });

        requestProduct.isApproved = true; 
        requestProduct.status = 'approved'; 
        await requestProduct.save();

        res.json({ success: true, message: "Token marked as Approved." });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.addApprovedToMaster = async (req, res) => {
    try {
        const { productId, hsnMasterId } = req.body; 
        if (!productId || !hsnMasterId) return res.status(400).json({ success: false, message: "IDs required" });

        const requestProduct = await MasterProduct.findById(productId.trim());
        const hsnDoc = await HsnMaster.findById(hsnMasterId.trim());

        if (!requestProduct || !hsnDoc) return res.status(404).json({ success: false, message: "Record not found" });

        requestProduct.hsnMasterId = hsnMasterId.trim();
        requestProduct.isApproved = true;
        requestProduct.status = 'active'; 
        await requestProduct.save();

        res.json({ success: true, message: "Successfully mapped HSN!", data: requestProduct });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.rejectProductRequest = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.body.productId);
        res.json({ success: true, message: "Request rejected." });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getPendingProductTokens = async (req, res) => {
    try {
        // 🔥 FIX: MasterProduct-la 'pending' records with Seller details
        const pending = await MasterProduct.find({ 
            status: 'pending', 
            isApproved: false 
        })
        .populate('category', 'name')
        .populate('subCategory', 'name')
        .populate('seller', 'shopName name address') // 🌟 ShopName ippo fetch aagum
        .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            count: pending.length, 
            data: pending 
        });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};