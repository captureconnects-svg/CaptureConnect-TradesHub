export type TradePackage = {
  name: string;
  price: number;
  description: string;
  hours: number;
  features: string[];
  addons: { name: string; price: number }[];
};

export const TRADE_PACKAGES: Record<string, TradePackage[]> = {
  "construction": [
    { name: "Gold", price: 4999, description: "Full project management and construction package for extensions or major renovations.", hours: 40, features: ["Project management included", "All permits handled", "Subcontractor coordination", "Weekly progress reports", "12-month defect liability"], addons: [{ name: "Architectural drawings", price: 800 }, { name: "Interior design", price: 600 }] },
    { name: "Silver", price: 1999, description: "Renovation package for single rooms or targeted structural work.", hours: 16, features: ["Detailed scope of work", "Permit assistance", "Licensed contractor"], addons: [{ name: "Project management", price: 500 }, { name: "Rubbish removal", price: 200 }] },
    { name: "Starter", price: 499, description: "Initial consultation, site assessment, and detailed quote for your building project.", hours: 4, features: ["Site inspection", "Detailed written quote", "Feasibility advice"], addons: [{ name: "Concept drawings", price: 300 }, { name: "Council advice", price: 150 }] },
  ],
  "electrical-plumbing": [
    { name: "Gold", price: 599, description: "Complete residential electrical and plumbing package with full inspection, repairs, and a certified safety report.", hours: 6, features: ["Full panel & wiring inspection", "Full plumbing inspection", "Up to 3 repairs included", "Certified safety report", "12-month workmanship warranty"], addons: [{ name: "EV charger", price: 250 }, { name: "Water treatment", price: 200 }] },
    { name: "Silver", price: 259, description: "Standard electrical or plumbing service for common household repairs and a basic safety assessment.", hours: 3, features: ["Up to 2 repairs", "Basic safety check", "Licensed & insured"], addons: [{ name: "Panel upgrade", price: 400 }, { name: "After-hours", price: 100 }] },
    { name: "Starter", price: 99, description: "Quick single-issue electrical or plumbing fix or diagnostic assessment.", hours: 1, features: ["Single repair or diagnosis", "Licensed tradesperson", "Parts not included"], addons: [{ name: "Additional hour", price: 90 }, { name: "Written report", price: 35 }] },
  ],
  "automotive": [
    { name: "Gold", price: 699, description: "Complete vehicle service, diagnostics, and full inspection package.", hours: 6, features: ["Full mechanical inspection", "Engine diagnostics", "Oil & filter change", "Brake & tyre check", "12-month service record"], addons: [{ name: "Wheel alignment", price: 80 }, { name: "Full detail", price: 150 }] },
    { name: "Silver", price: 299, description: "Standard service covering essential maintenance items and a safety check.", hours: 3, features: ["Oil & filter change", "Safety inspection", "Fluid top-ups", "ASE certified tech"], addons: [{ name: "AC service", price: 100 }, { name: "Tyre rotation", price: 40 }] },
    { name: "Starter", price: 99, description: "Quick diagnostic visit to identify and quote on vehicle faults.", hours: 1, features: ["OBD diagnostic scan", "Fault report", "Licensed mechanic"], addons: [{ name: "Same-day repair", price: 150 }, { name: "After-hours", price: 80 }] },
  ],
  "home-services": [
    { name: "Gold", price: 599, description: "Full home maintenance package covering HVAC, plumbing checks, and general repairs.", hours: 5, features: ["HVAC full service", "Plumbing inspection", "General repairs included", "Performance report", "Priority scheduling"], addons: [{ name: "Smart thermostat", price: 150 }, { name: "Extended warranty", price: 100 }] },
    { name: "Silver", price: 249, description: "Standard home maintenance service covering key systems and a walkthrough inspection.", hours: 2, features: ["System tune-up", "Filter check & replace", "Basic diagnostic", "Licensed professional"], addons: [{ name: "Duct cleaning", price: 200 }, { name: "After-hours", price: 75 }] },
    { name: "Starter", price: 99, description: "Quick diagnostic visit to identify and quote on home maintenance faults.", hours: 1, features: ["System diagnosis", "Fault report", "Licensed professional"], addons: [{ name: "Same-day repair", price: 150 }, { name: "After-hours callout", price: 100 }] },
  ],
  "beauty-fashion": [
    { name: "Gold", price: 399, description: "Premium full-service beauty and styling package for special occasions.", hours: 4, features: ["Hair styling & colour", "Full makeup application", "Skincare treatment", "Nail services", "Personalised style consultation"], addons: [{ name: "Bridal upgrade", price: 150 }, { name: "Express lashes", price: 60 }] },
    { name: "Silver", price: 179, description: "Standard beauty service covering hair and makeup for events or everyday looks.", hours: 2, features: ["Hair styling", "Makeup application", "Licensed cosmetologist"], addons: [{ name: "Colour upgrade", price: 80 }, { name: "Nail add-on", price: 50 }] },
    { name: "Starter", price: 75, description: "Quick freshen-up or consultation for a single beauty service.", hours: 1, features: ["Single service included", "Style consultation", "Licensed professional"], addons: [{ name: "Extra treatment", price: 40 }, { name: "Product pack", price: 30 }] },
  ],
  "agriculture": [
    { name: "Gold", price: 1199, description: "Full land management and crop support package including soil testing and irrigation.", hours: 10, features: ["Soil health assessment", "Crop management plan", "Irrigation setup", "Pest & disease check", "3-month advisory support"], addons: [{ name: "Drone survey", price: 200 }, { name: "Organic certification support", price: 300 }] },
    { name: "Silver", price: 499, description: "Seasonal agricultural service covering key maintenance and productivity checks.", hours: 5, features: ["Field inspection", "Fertilisation plan", "Pest management", "Licensed agronomist"], addons: [{ name: "Water testing", price: 100 }, { name: "Extra acreage", price: 150 }] },
    { name: "Starter", price: 149, description: "Initial site assessment and recommendations for your agricultural property.", hours: 2, features: ["Site walk-through", "Basic soil check", "Written recommendations"], addons: [{ name: "Soil lab test", price: 80 }, { name: "Follow-up visit", price: 60 }] },
  ],
  "repair-services": [
    { name: "Gold", price: 349, description: "Comprehensive repair package covering multiple items with priority turnaround.", hours: 4, features: ["Up to 3 repairs included", "Priority scheduling", "Parts sourcing service", "Quality guarantee", "12-month workmanship warranty"], addons: [{ name: "Express turnaround", price: 50 }, { name: "Pickup & delivery", price: 30 }] },
    { name: "Silver", price: 149, description: "Standard repair service for a single item or fault.", hours: 2, features: ["Single repair included", "Diagnostic included", "Licensed technician"], addons: [{ name: "Parts upgrade", price: 50 }, { name: "After-hours", price: 75 }] },
    { name: "Starter", price: 69, description: "Quick diagnostic visit to identify the fault and provide a repair quote.", hours: 1, features: ["Fault diagnosis", "Written quote", "Licensed technician"], addons: [{ name: "Same-day repair", price: 80 }, { name: "Written report", price: 25 }] },
  ],
  "cleaning-maintenance": [
    { name: "Gold", price: 449, description: "Full deep-clean and maintenance package for residential or commercial properties.", hours: 5, features: ["Full property deep clean", "Carpet steam cleaning", "Window washing", "Eco-friendly products", "Property left spotless"], addons: [{ name: "Pressure washing", price: 100 }, { name: "Oven detail", price: 50 }] },
    { name: "Silver", price: 199, description: "Standard clean covering all main living areas with quality products.", hours: 3, features: ["All rooms cleaned", "Bathrooms & kitchen", "Eco-friendly products", "Licensed cleaner"], addons: [{ name: "Carpet clean", price: 100 }, { name: "Balcony/outdoor", price: 50 }] },
    { name: "Starter", price: 79, description: "Quick clean for a single room or targeted area.", hours: 1, features: ["Single area clean", "Professional products", "Licensed cleaner"], addons: [{ name: "Additional room", price: 40 }, { name: "Window clean", price: 30 }] },
  ],
  "retail-wholesale": [
    { name: "Gold", price: 299, description: "Premium curated bundle with exclusive handcrafted items and luxury gift wrapping.", hours: 0, features: ["10 premium curated items", "Luxury gift wrapping", "Priority tracked shipping", "Certificate of authenticity", "30-day return policy"], addons: [{ name: "Custom engraving", price: 25 }, { name: "Express delivery", price: 15 }] },
    { name: "Silver", price: 149, description: "Quality selection of products delivered to your door.", hours: 0, features: ["5 curated items", "Branded packaging", "Standard tracked shipping", "14-day returns"], addons: [{ name: "Gift wrap upgrade", price: 10 }, { name: "Rush processing", price: 20 }] },
    { name: "Starter", price: 49, description: "Sample package to discover your new favourite products.", hours: 0, features: ["2 sample items", "Basic packaging", "Standard shipping", "7-day returns"], addons: [{ name: "Personalised note", price: 5 }, { name: "Extra item", price: 25 }] },
  ],
  "food-catering": [
    { name: "Gold", price: 1499, description: "Full-service catering package for events up to 50 guests including setup and service staff.", hours: 8, features: ["Custom menu design", "Full setup & service", "Dedicated wait staff", "Equipment hire included", "Post-event cleanup"], addons: [{ name: "Bar service", price: 400 }, { name: "Dessert table", price: 200 }] },
    { name: "Silver", price: 649, description: "Standard catering service for smaller gatherings with fresh, prepared dishes.", hours: 4, features: ["Set menu for up to 20", "Food delivery & setup", "ServSafe certified chef"], addons: [{ name: "Custom menu", price: 100 }, { name: "Service staff", price: 200 }] },
    { name: "Starter", price: 199, description: "Express catering package for intimate gatherings or office lunches.", hours: 2, features: ["Dishes for up to 8", "Delivery included", "Licensed food handler"], addons: [{ name: "Dietary options", price: 30 }, { name: "Drinks package", price: 50 }] },
  ],
  "electronics-tech": [
    { name: "Gold", price: 499, description: "Complete tech setup and support package including network, devices, and security.", hours: 5, features: ["Full network setup", "Device configuration", "Security system install", "Performance optimisation", "12-month support plan"], addons: [{ name: "Smart home integration", price: 200 }, { name: "Server setup", price: 300 }] },
    { name: "Silver", price: 199, description: "Standard tech support and device repair for home or small business.", hours: 2, features: ["Device diagnosis & repair", "Software setup", "CompTIA certified tech"], addons: [{ name: "Data recovery", price: 100 }, { name: "Network check", price: 75 }] },
    { name: "Starter", price: 89, description: "Quick diagnostic and quote for tech faults or device issues.", hours: 1, features: ["Fault diagnosis", "Written quote", "Certified technician"], addons: [{ name: "Same-day repair", price: 80 }, { name: "Remote support", price: 30 }] },
  ],
  "manufacturing-fabrication": [
    { name: "Gold", price: 799, description: "Full custom fabrication package for gates, railings, structural steel, or precision components.", hours: 6, features: ["Custom design included", "Full fabrication & install", "Structural certificate", "Powder coat finish", "5-year warranty"], addons: [{ name: "Decorative finish", price: 150 }, { name: "Additional section", price: 200 }] },
    { name: "Silver", price: 399, description: "Standard fabrication service for repairs, modifications, or small custom builds.", hours: 3, features: ["Up to 2 fabrications or repairs", "Grinding & finishing", "AWS certified welder"], addons: [{ name: "Galvanising", price: 100 }, { name: "Site delivery", price: 75 }] },
    { name: "Starter", price: 149, description: "Single fabrication repair or quick on-site fix for urgent metalwork.", hours: 1, features: ["Single repair or fabrication", "Clean-up included", "Certified tradesperson"], addons: [{ name: "Additional repair", price: 100 }, { name: "Rust treatment", price: 50 }] },
  ],
  "transportation-delivery": [
    { name: "Gold", price: 449, description: "Full logistics service including multiple pickups, delivery, and property clearout.", hours: 5, features: ["Multiple pickup locations", "Full property clearout", "Sorting & recycling", "Same-day service", "Property left broom-clean"], addons: [{ name: "Hazardous disposal", price: 100 }, { name: "Fragile item handling", price: 50 }] },
    { name: "Silver", price: 199, description: "Standard transport service for furniture, appliances, or mid-size cargo.", hours: 2, features: ["Up to 1 van load", "Eco-friendly disposal", "DOT certified driver"], addons: [{ name: "Same-day priority", price: 75 }, { name: "Extra load", price: 150 }] },
    { name: "Starter", price: 79, description: "Small item transport or single pickup for quick delivery needs.", hours: 1, features: ["Up to 5 items", "Quick pick-up service", "DOT certified driver"], addons: [{ name: "Donation drop-off", price: 30 }, { name: "Extra items", price: 25 }] },
  ],
  "film-photography": [
    { name: "Gold", price: 1299, description: "Full-day photography or videography package with edited deliverables and a print set.", hours: 8, features: ["Full-day coverage", "100+ edited photos or 5-min video", "Online gallery", "Print set included", "2-week turnaround"], addons: [{ name: "Drone footage", price: 200 }, { name: "Rush editing", price: 150 }] },
    { name: "Silver", price: 549, description: "Half-day shoot covering an event, product range, or portrait session.", hours: 4, features: ["Half-day coverage", "50+ edited photos", "Online delivery", "Licensed photographer"], addons: [{ name: "Extra hour", price: 150 }, { name: "Print pack", price: 100 }] },
    { name: "Starter", price: 199, description: "Short session for headshots, product photos, or a quick content shoot.", hours: 1.5, features: ["Up to 20 edited photos", "Online delivery", "Licensed photographer"], addons: [{ name: "Extra 30 min", price: 100 }, { name: "Printed portraits", price: 50 }] },
  ],
  "music-entertainment": [
    { name: "Gold", price: 999, description: "Full-night entertainment package with live performance, professional sound and lighting.", hours: 5, features: ["Full live set (4+ hours)", "Professional PA system", "Stage lighting", "MC services included", "Sound check & setup"], addons: [{ name: "Extra hour", price: 150 }, { name: "Custom playlist", price: 50 }] },
    { name: "Silver", price: 449, description: "Standard live performance or DJ set for events and private functions.", hours: 3, features: ["2-hour live set or DJ set", "Sound system included", "ASCAP licensed"], addons: [{ name: "Extra hour", price: 120 }, { name: "Lighting rig", price: 150 }] },
    { name: "Starter", price: 199, description: "Short acoustic set or background music for intimate gatherings.", hours: 1.5, features: ["90-min acoustic set", "Basic PA included", "Fully insured performer"], addons: [{ name: "Extended set", price: 100 }, { name: "Song requests", price: 30 }] },
  ],
  "events-decorations": [
    { name: "Gold", price: 1499, description: "Full event styling and décor package from concept to strike, including florals and furniture.", hours: 10, features: ["Custom concept design", "Full setup & strike", "Floral arrangements", "Furniture & linen hire", "On-site stylist"], addons: [{ name: "Photo backdrop", price: 200 }, { name: "Neon signage", price: 150 }] },
    { name: "Silver", price: 649, description: "Standard décor package for a single venue space with coordinated styling.", hours: 5, features: ["Themed décor setup", "Centrepieces included", "Strike included", "CSEP certified planner"], addons: [{ name: "Balloon installation", price: 100 }, { name: "Uplighting", price: 150 }] },
    { name: "Starter", price: 199, description: "Basic decoration setup for small gatherings or pop-up events.", hours: 2, features: ["Basic balloon & table décor", "Setup included", "Fully insured"], addons: [{ name: "Personalised banner", price: 40 }, { name: "Extra décor items", price: 50 }] },
  ],
  "printing-branding": [
    { name: "Gold", price: 799, description: "Full brand identity and print package including logo, collateral, and large-format printing.", hours: 8, features: ["Logo design & brand guide", "Business cards (500)", "Letterhead & envelopes", "Social media kit", "Large-format banner"], addons: [{ name: "Vehicle wrap design", price: 300 }, { name: "Extra print run", price: 150 }] },
    { name: "Silver", price: 349, description: "Standard branding package covering core print materials for a business.", hours: 4, features: ["Business cards (250)", "Branded flyer design", "1 banner design", "G7 certified print"], addons: [{ name: "Logo refresh", price: 150 }, { name: "Extra print items", price: 100 }] },
    { name: "Starter", price: 99, description: "Quick-turnaround print job for a single material or small order.", hours: 1, features: ["Single product print", "Design included", "ISO certified printer"], addons: [{ name: "Rush production", price: 50 }, { name: "Foil finish", price: 40 }] },
  ],
  "real-estate": [
    { name: "Gold", price: 2999, description: "Full property sales and marketing package from listing to settlement.", hours: 20, features: ["Professional photography", "Full marketing campaign", "Open home management", "Negotiation & contract support", "Settlement coordination"], addons: [{ name: "Staging consultation", price: 300 }, { name: "Video tour", price: 200 }] },
    { name: "Silver", price: 999, description: "Standard listing package covering appraisal, photography, and online marketing.", hours: 8, features: ["Property appraisal", "Photography included", "Online listings", "Licensed agent"], addons: [{ name: "Social media ads", price: 200 }, { name: "Floorplan", price: 100 }] },
    { name: "Starter", price: 299, description: "Initial property consultation, appraisal, and strategic advice.", hours: 2, features: ["Market appraisal", "Comparative analysis", "Written strategy report"], addons: [{ name: "Staging advice", price: 100 }, { name: "Renovation ROI report", price: 80 }] },
  ],
  "health-wellness": [
    { name: "Gold", price: 599, description: "Comprehensive wellness program including fitness, nutrition, and lifestyle coaching.", hours: 8, features: ["Initial health assessment", "Custom fitness plan", "Nutrition coaching", "Weekly check-ins", "3-month progress tracking"], addons: [{ name: "Supplement plan", price: 50 }, { name: "Body composition analysis", price: 40 }] },
    { name: "Silver", price: 249, description: "Standard personal training or wellness coaching package for ongoing support.", hours: 4, features: ["4 personal training sessions", "Exercise program", "Nutrition guidelines", "NASM certified trainer"], addons: [{ name: "Additional session", price: 60 }, { name: "Meal plan", price: 50 }] },
    { name: "Starter", price: 89, description: "Initial fitness consultation and personalised program design.", hours: 1, features: ["Health & fitness assessment", "Goal setting session", "Written program"], addons: [{ name: "Follow-up session", price: 60 }, { name: "Nutritional guide", price: 25 }] },
  ],
  "tourism-hospitality": [
    { name: "Gold", price: 799, description: "Full-day guided experience package including transport, meals, and exclusive access.", hours: 8, features: ["Full-day guided tour", "Private transport", "Lunch & refreshments", "Exclusive venue access", "Personalised itinerary"], addons: [{ name: "Sunset extension", price: 100 }, { name: "Souvenir pack", price: 50 }] },
    { name: "Silver", price: 349, description: "Half-day guided experience covering key highlights with a local expert.", hours: 4, features: ["Half-day guided tour", "Group transport", "Light refreshments", "Licensed guide"], addons: [{ name: "Private upgrade", price: 150 }, { name: "Photography package", price: 80 }] },
    { name: "Starter", price: 99, description: "Short curated experience or transfer service for visitors.", hours: 1.5, features: ["1.5-hour guided experience or transfer", "Local expert guide", "Licensed operator"], addons: [{ name: "Extra stop", price: 40 }, { name: "Souvenir", price: 20 }] },
  ],
};
