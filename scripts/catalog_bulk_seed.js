const mongoose = require('mongoose');

const seedDatabase = async () => {
    try {
        console.log("⏳ Connecting to Zhopingo MongoDB...");
        const mongoURI = "mongodb+srv://zhopingo:Zhopingo28%40@cluster0.wzjuvty.mongodb.net/zhopingo?retryWrites=true&w=majority";
        await mongoose.connect(mongoURI);
        console.log("✅ Connected!");

        const db = mongoose.connection.db;
        // பழைய டேட்டாவை முழுமையாக நீக்குதல்
        await db.collection('categories').deleteMany({});
        await db.collection('subcategories').deleteMany({});
        await db.collection('products').deleteMany({});
        await db.collection('hsnmasters').deleteMany({});

        // தயாரிப்புகளுக்கான PNG ஐகான்கள்
        const productIcons = [
            'https://cdn-icons-png.flaticon.com/512/3081/3081913.png', 
            'https://cdn-icons-png.flaticon.com/512/2674/2674486.png', 
            'https://cdn-icons-png.flaticon.com/512/3058/3058995.png', 
            'https://cdn-icons-png.flaticon.com/512/2437/2437700.png', 
            'https://cdn-icons-png.flaticon.com/512/1514/1514922.png', 
            'https://cdn-icons-png.flaticon.com/512/2553/2553642.png', 
            'https://cdn-icons-png.flaticon.com/512/822/822102.png',   
            'https://cdn-icons-png.flaticon.com/512/2224/2224115.png'  
        ];

        // 🌟 நீங்கள் குறிப்பிட்ட 12 கேட்டகிரி டேட்டா
        const rawData = [
            { name: "Daily Staples", subs: ["Rice", "Millets", "Wheat & Flours", "Pulses & Dals", "Whole Spices", "Premium Spices", "Spice Powders", "Sweeteners", "Pickles"] },
            { name: "Groceries", subs: ["Cooking Oils", "Ghee", "Nuts & Seed Oils", "Dry Fruits", "Seeds"] },
            { name: "Fresh Produce", subs: ["Vegetables", "Fruits", "Exotic Vegetables", "Herbs & Leafies"] },
            { name: "Dairy & Eggs", subs: ["Milk", "Paneer & Cheese", "Butter & Curd", "Country Eggs"] },
            { name: "Beverages", subs: ["Tea & Coffee", "Health Drinks", "Fresh Juices", "Fermented Drinks"] },
            { name: "Snacks", subs: ["Ready-to-Cook", "Millet Snacks", "Organic Biscuits", "Chips & Foxnuts"] },
            { name: "Nutrition", subs: ["Herbal Powders", "Superfoods", "Nut Mixes"] },
            { name: "Personal Care", subs: ["Body & Hair Care", "Oral Care", "Essential Oils"] },
            { name: "Home Care", subs: ["Bamboo Products", "Neem Products", "Natural Scrubbers"] },
            { name: "Little Care", subs: ["Eco Pads", "Cloth Diapers", "Organic Baby Soap"] },
            { name: "Organic Specials", subs: ["Organic Chocolate", "Peanut Butter", "Gourmet Sauces", "Fermented Foods"] },
            { name: "Specialty", subs: ["Amla Specials", "Aloe Vera Products", "Cold-Pressed Range"] }
        ];

        // 1. HSN Master & Categories உருவாக்கம்
        const categories = [];
        const hsns = [];
        for (let i = 0; i < rawData.length; i++) {
            const hsnCode = `HSN${2000 + i}`;
            hsns.push({ hsnCode, gstRate: 12, description: `${rawData[i].name} HSN`, status: true });
            categories.push({
                name: rawData[i].name,
                image: productIcons[i % productIcons.length],
                hsnCode: hsnCode,
                gstRate: 12,
                isActive: true,
                createdAt: new Date()
            });
        }
        await db.collection('hsnmasters').insertMany(hsns);
        const catResult = await db.collection('categories').insertMany(categories);
        const catIds = Object.values(catResult.insertedIds);

        // 2. Sub-Categories உருவாக்கம்
        const subCategories = [];
        rawData.forEach((cat, idx) => {
            cat.subs.forEach(subName => {
                subCategories.push({
                    name: subName,
                    category: catIds[idx],
                    image: productIcons[idx % productIcons.length],
                    hsnCode: categories[idx].hsnCode,
                    gstRate: 12,
                    createdAt: new Date()
                });
            });
        });
        const subResult = await db.collection('subcategories').insertMany(subCategories);
        const subIds = Object.values(subResult.insertedIds);

        // 3. 5000 தயாரிப்புகள் உருவாக்கம் (isArchived: false சேர்த்துள்ளேன்)
        const sellerId = new mongoose.Types.ObjectId("65b2f1a2e4b0a1a2b3c4d5e6");
        console.log("🚀 Generating 5000 Products...");
        
        let productBatch = [];
        for (let i = 1; i <= 5000; i++) {
            const subIdx = i % subIds.length;
            const sub = subCategories[subIdx];
            
            productBatch.push({
                name: `${sub.name} - Batch ${Math.ceil(i/100)} Item ${i}`,
                description: `Premium quality ${sub.name} product sourced for Zhopingo customers.`,
                price: 45 + (i % 850),
                mrp: 90 + (i % 850),
                hsnCode: sub.hsnCode,
                gstPercentage: 12,
                stock: 200,
                images: [productIcons[i % productIcons.length]], 
                category: sub.category,
                subCategory: subIds[subIdx],
                weight: i % 3 === 0 ? "250g" : (i % 2 === 0 ? "500g" : "1kg"),
                seller: sellerId,
                offerTag: i % 8 === 0 ? "Limited Offer" : (i % 5 === 0 ? "Bestseller" : "Organic"),
                isArchived: false, // 🌟 மிக முக்கியம்: இது இருந்தால் தான் போஸ்ட்மேனில் வரும்
                isCancellable: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            if (productBatch.length === 1000) {
                await db.collection('products').insertMany(productBatch);
                productBatch = [];
                console.log(`📦 Inserted ${i} products...`);
            }
        }

        if (productBatch.length > 0) {
            await db.collection('products').insertMany(productBatch);
        }

        console.log(`✅ SUCCESS! Seeded 12 Categories, ${subIds.length} Sub-Categories, and 5000 Products.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ SEEDING ERROR:", err.message);
        process.exit(1);
    }
};

seedDatabase();