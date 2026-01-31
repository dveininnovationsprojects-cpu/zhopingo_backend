const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const seedDatabase = async () => {
    try {
        console.log("⏳ Connecting to Zhopingo MongoDB...");
        mongoose.set('bufferCommands', false);

        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zhopingo';
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
        console.log("✅ Connected to Database!");

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 1. நேரடி கலெக்ஷன் மூலம் சுத்தம் செய்தல்
        const db = mongoose.connection.db;
        await db.collection('categories').deleteMany({});
        await db.collection('subcategories').deleteMany({});
        await db.collection('products').deleteMany({});
        console.log("🧹 Old Data Cleared");

        // 2. 10 கேட்டகரிகள் (CDN Images)
        const categoryData = [
            { name: "Vegetables & Fruits", image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400" },
            { name: "Dairy, Bread & Eggs", image: "https://images.unsplash.com/photo-1550583724-125581f77833?w=400" },
            { name: "Snacks & Munchies", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bb087?w=400" },
            { name: "Cold Drinks & Juices", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400" },
            { name: "Instant Food", image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400" },
            { name: "Bakery & Biscuits", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400" },
            { name: "Tea, Coffee & Drinks", image: "https://images.unsplash.com/photo-1544787210-22bb8306385e?w=400" },
            { name: "Cleaning Essentials", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400" },
            { name: "Beauty & Personal Care", image: "https://images.unsplash.com/photo-1596462502278-27bfac4033c8?w=400" },
            { name: "Baby Care", image: "https://images.unsplash.com/photo-1522771935876-2497116a524e?w=400" }
        ];

        // நேரடியாக இன்செர்ட் செய்கிறோம்
        const insertedCats = await db.collection('categories').insertMany(
            categoryData.map(c => ({ ...c, isActive: true, createdAt: new Date(), updatedAt: new Date() }))
        );
        console.log("✅ 10 Categories Inserted");

        // 3. 27 சப்-கேட்டகரிகள் (HSN Mapping)
        const subCatList = [];
        const types = ["Premium", "Organic", "Fresh"];
        const catIds = Object.values(insertedCats.insertedIds);

        categoryData.forEach((cat, idx) => {
            for (let i = 0; i < 3; i++) {
                if(subCatList.length < 27) {
                    subCatList.push({
                        name: `${types[i]} ${cat.name}`,
                        category: catIds[idx],
                        image: cat.image,
                        hsnCode: `610${idx}${i}`,
                        description: `Quality selection from ${cat.name}`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
            }
        });
        const insertedSubs = await db.collection('subcategories').insertMany(subCatList);
        console.log("✅ 27 Sub-Categories Created");

        // 4. 3100 தயாரிப்புகள் (ObjectId Mapping)
        const subCatEntries = Object.values(insertedSubs.insertedIds);
        const productList = [];
        const sellerId = new mongoose.Types.ObjectId("65b2f1a2e4b0a1a2b3c4d5e6"); 

        for (let i = 1; i <= 3100; i++) {
            const subIndex = i % subCatEntries.length;
            const sub = subCatList[subIndex];
            productList.push({
                name: `${sub.name} Item ${i}`,
                description: "Fresh quality product from Zhopingo store.",
                price: 40 + (i % 450),
                mrp: 80 + (i % 450),
                hsnCode: sub.hsnCode,
                gstPercentage: 12,
                stock: 100,
                images: [
                    sub.image,
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
                    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400"
                ],
                video: "https://www.w3schools.com/html/mov_bbb.mp4",
                category: sub.category,
                subCategory: subCatEntries[subIndex],
                weight: i % 2 === 0 ? "500g" : "1kg",
                seller: sellerId,
                offerTag: i % 10 === 0 ? "Flat ₹50 OFF" : (i % 7 === 0 ? "33% OFF" : "BEST DEAL"),
                isCancellable: true,
                isArchived: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        console.log("🚀 Bulk Inserting 3100 Products...");
        await db.collection('products').insertMany(productList);
        
        console.log(`✅ SUCCESS! Seeded 10 Categories, 27 Sub-Categories, and 3100 Products.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ SEEDING ERROR:", err.message);
        process.exit(1);
    }
};

seedDatabase();