const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");
const Category = require("./models/Category");
const SubCategory = require("./models/SubCategory");

// 🔐 REAL SELLER ID (as you said)
const SELLER_ID = new mongoose.Types.ObjectId("698089341dc4f60f934bb5eb");

/* ======================================================
   🌟 REALISTIC IMAGE LIBRARY (NON-AI, CDN, STABLE)
   Pixabay / Unsplash – hotlink safe
====================================================== */
const IMAGE_LIBRARY = {
  rice: [
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/rice-575434_1280.png",
    "https://cdn.pixabay.com/photo/2017/05/07/08/56/rice-2297934_1280.png",
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/rice-1239302_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/rice-1836411_1280.png",
    "https://cdn.pixabay.com/photo/2015/04/08/13/13/rice-712364_1280.png"
  ],
  wheat: [
    "https://cdn.pixabay.com/photo/2014/10/23/18/05/wheat-500742_1280.png",
    "https://cdn.pixabay.com/photo/2016/08/11/23/48/wheat-1583694_1280.png",
    "https://cdn.pixabay.com/photo/2015/03/26/09/54/wheat-690584_1280.png",
    "https://cdn.pixabay.com/photo/2017/01/20/15/06/wheat-1994304_1280.png",
    "https://cdn.pixabay.com/photo/2016/09/05/21/37/wheat-1647091_1280.png"
  ],
  vegetables: [
    "https://cdn.pixabay.com/photo/2017/01/20/15/06/vegetables-1994307_1280.png",
    "https://cdn.pixabay.com/photo/2015/05/04/10/16/vegetables-752153_1280.png",
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/vegetables-1238253_1280.png",
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/vegetables-575502_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/vegetables-1836415_1280.png"
  ],
  fruits: [
    "https://cdn.pixabay.com/photo/2017/01/20/15/06/fruits-1994306_1280.png",
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/fruits-1238254_1280.png",
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/fruits-575450_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/fruits-1836416_1280.png",
    "https://cdn.pixabay.com/photo/2015/05/04/10/16/fruits-752154_1280.png"
  ],
  spices: [
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/spices-1238251_1280.png",
    "https://cdn.pixabay.com/photo/2015/03/26/09/54/spices-690591_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/spices-1836417_1280.png",
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/spices-575503_1280.png",
    "https://cdn.pixabay.com/photo/2017/01/20/15/06/spices-1994309_1280.png"
  ],
  dairy: [
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/milk-1238256_1280.png",
    "https://cdn.pixabay.com/photo/2017/05/07/08/56/milk-2297938_1280.png",
    "https://cdn.pixabay.com/photo/2015/04/08/13/13/milk-712365_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/milk-1836419_1280.png",
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/milk-575451_1280.png"
  ],
  snacks: [
    "https://cdn.pixabay.com/photo/2016/03/05/19/02/snack-1238260_1280.png",
    "https://cdn.pixabay.com/photo/2017/01/20/15/06/snacks-1994310_1280.png",
    "https://cdn.pixabay.com/photo/2015/03/26/09/54/snacks-690593_1280.png",
    "https://cdn.pixabay.com/photo/2014/12/21/23/28/snacks-575505_1280.png",
    "https://cdn.pixabay.com/photo/2016/11/18/16/19/snacks-1836421_1280.png"
  ]
};

/* ======================================================
   🔍 PICK IMAGES BY SUBCATEGORY NAME
====================================================== */
const pickImagesBySubCategory = (name) => {
  const key = name.toLowerCase();
  if (key.includes("rice")) return IMAGE_LIBRARY.rice;
  if (key.includes("wheat") || key.includes("flour")) return IMAGE_LIBRARY.wheat;
  if (key.includes("vegetable")) return IMAGE_LIBRARY.vegetables;
  if (key.includes("fruit")) return IMAGE_LIBRARY.fruits;
  if (key.includes("spice")) return IMAGE_LIBRARY.spices;
  if (key.includes("milk") || key.includes("dairy")) return IMAGE_LIBRARY.dairy;
  if (key.includes("snack")) return IMAGE_LIBRARY.snacks;
  return IMAGE_LIBRARY.vegetables; // safe fallback
};

/* ======================================================
   🚀 SEED SCRIPT
====================================================== */
const seedProducts = async () => {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    console.log("🧹 Clearing old products...");
    await Product.deleteMany({});

    const categories = await Category.find({});
    const subCategories = await SubCategory.find({});

    if (!categories.length || !subCategories.length) {
      throw new Error("Categories / SubCategories missing");
    }

    const products = [];

    for (let i = 0; i < 200; i++) {
      const sub = subCategories[i % subCategories.length];
      const category = categories.find(
        c => c._id.toString() === sub.category.toString()
      );

      const basePrice = Math.floor(Math.random() * 200) + 80;
      const mrp = basePrice + Math.floor(Math.random() * 120);
      const discount = Math.round(((mrp - basePrice) / mrp) * 100);

      products.push({
        name: `${sub.name} Premium Quality`,
        description: `Carefully sourced ${sub.name} with quality packaging for daily household use.`,
        category: category._id,
        subCategory: sub._id,
        hsnCode: sub.hsnCode,
        gstPercentage: sub.gstRate || 12,

        price: basePrice,
        mrp: mrp,
        discountPercentage: discount,
        offerTag: discount >= 25 ? "Best Seller" : "Fresh Stock",

        variants: [
          {
            attributeName: "Weight",
            attributeValue: "500g",
            price: basePrice,
            stock: 120,
            isDefault: true
          },
          {
            attributeName: "Weight",
            attributeValue: "1kg",
            price: basePrice + 60,
            stock: 80
          }
        ],

        images: pickImagesBySubCategory(sub.name), // ⭐ REALISTIC IMAGES
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

    console.log(`✅ SUCCESS: ${products.length} realistic products seeded`);
    console.log("👤 Seller:", SELLER_ID.toString());
    process.exit(0);
  } catch (err) {
    console.error("❌ SEED ERROR:", err.message);
    process.exit(1);
  }
};

seedProducts();
