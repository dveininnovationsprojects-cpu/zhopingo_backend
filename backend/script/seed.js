const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

// ✅ CORRECT PATHS
const Product = require("../models/Product");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");

// ✅ REAL SELLER ID
const SELLER_ID = new mongoose.Types.ObjectId("698089341dc4f60f934bb5eb");

const IMAGE_LIBRARY = {
  vegetables: [
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506807803488-8eafc15323c7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80"
  ],

  fruits: [
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1574226516831-e1dff420e12b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=80"
  ],

  rice: [
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1624378445478-02e7f8f53d80?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1615485925873-1a4c9c8fa6a7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=800&q=80"
  ],

  spices: [
    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1615485291237-4fadb2f7c1c3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505577058444-a3dab90d4253?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1615485500704-8e990f0b7f98?auto=format&fit=crop&w=800&q=80"
  ]
};


const pickImages = (name) => {
  const n = name.toLowerCase();
  if (n.includes("rice")) return IMAGE_LIBRARY.rice;
  if (n.includes("vegetable")) return IMAGE_LIBRARY.vegetables;
  if (n.includes("fruit")) return IMAGE_LIBRARY.fruits;
  if (n.includes("spice")) return IMAGE_LIBRARY.spices;
  return IMAGE_LIBRARY.vegetables;
};

/* ================= SEED ================= */
const seed = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    await Product.deleteMany({});
    console.log("🧹 Old products cleared");

    const categories = await Category.find();
    const subCategories = await SubCategory.find();

    if (!categories.length || !subCategories.length) {
      throw new Error("Categories / SubCategories missing");
    }

    const products = [];

    for (let i = 0; i < 150; i++) {
      const sub = subCategories[i % subCategories.length];
      const category = categories.find(
        c => c._id.toString() === sub.category.toString()
      );

      const price = 90 + (i % 120);
      const mrp = price + 60;

      products.push({
        name: `${sub.name} Premium Quality`,
        description: `Carefully sourced ${sub.name} for daily household needs.`,
        category: category._id,
        subCategory: sub._id,
        hsnCode: sub.hsnCode,
        gstPercentage: sub.gstRate || 12,

        price,
        mrp,
        discountPercentage: Math.round(((mrp - price) / mrp) * 100),
        offerTag: "Best Seller",

        variants: [
          {
            attributeName: "Weight",
            attributeValue: "500g",
            price,
            stock: 100,
            isDefault: true
          },
          {
            attributeName: "Weight",
            attributeValue: "1kg",
            price: price + 70,
            stock: 60
          }
        ],

        images: pickImages(sub.name),
        stock: 200,
        seller: SELLER_ID,

        isFreeDelivery: true,
        isReturnable: true,
        returnWindow: 7,
        isCancellable: true,
        averageRating: 4.4,
        isArchived: false
      });
    }

    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully`);
    process.exit(0);
  } catch (err) {
    console.error("❌ SEED ERROR:", err.message);
    process.exit(1);
  }
};

seed();
