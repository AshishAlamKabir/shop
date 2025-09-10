import { storage } from "./storage";
import path from "path";
import fs from "fs";

// Demo image mappings
const demoProfileImages = {
  'RETAILER': '../attached_assets/generated_images/Female_retailer_profile_photo_08929486.png',
  'SHOP_OWNER': '../attached_assets/generated_images/Male_shop_owner_profile_a3127355.png',
  'DELIVERY_BOY': '../attached_assets/generated_images/Delivery_person_profile_photo_ef269ac2.png',
  'ADMIN': '../attached_assets/generated_images/Admin_executive_profile_photo_ff9a2046.png'
};

const demoProductImages = [
  '../attached_assets/generated_images/Wireless_bluetooth_speaker_product_7eea37ed.png',
  '../attached_assets/generated_images/Wireless_headphones_product_photo_d69abcb8.png',
  '../attached_assets/generated_images/Modern_smartphone_product_photo_9bfd5141.png',
  '../attached_assets/generated_images/Coffee_beans_product_package_5ec7f421.png'
];

// Copy image to uploads directory and return the new path
async function copyImageToUploads(sourcePath: string, fileName: string): Promise<string> {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const sourceFullPath = path.join(process.cwd(), sourcePath);
    const destPath = path.join(uploadsDir, fileName);
    
    // Check if source file exists
    if (fs.existsSync(sourceFullPath)) {
      // Copy file to uploads directory
      fs.copyFileSync(sourceFullPath, destPath);
      console.log(`✓ Copied ${sourcePath} to uploads/${fileName}`);
      return `/uploads/${fileName}`;
    } else {
      console.log(`✗ Source file not found: ${sourceFullPath}`);
      return '';
    }
  } catch (error) {
    console.error(`Error copying ${sourcePath}:`, error);
    return '';
  }
}

export async function seedDemoImages() {
  console.log('🌱 Starting demo image seeding...');
  
  try {
    // Get all users
    const users = await storage.getAllUsers();
    console.log(`Found ${users.length} users in database`);
    
    // Update users with profile photos based on their roles
    let profileUpdateCount = 0;
    for (const user of users) {
      if (user.role && demoProfileImages[user.role as keyof typeof demoProfileImages]) {
        const sourcePath = demoProfileImages[user.role as keyof typeof demoProfileImages];
        const fileName = `profile_${user.role.toLowerCase()}_${user.id.slice(0, 8)}.png`;
        const uploadPath = await copyImageToUploads(sourcePath, fileName);
        
        if (uploadPath) {
          await storage.updateUser(user.id, { profilePhoto: uploadPath });
          profileUpdateCount++;
          console.log(`✓ Updated ${user.role} user ${user.fullName} with profile photo`);
        }
      }
    }
    
    // Get all products
    const products = await storage.getProducts();
    console.log(`Found ${products.length} products in catalog`);
    
    // Update products with demo images
    let productUpdateCount = 0;
    for (let i = 0; i < products.length && i < demoProductImages.length; i++) {
      const product = products[i];
      const sourcePath = demoProductImages[i];
      const fileName = `product_${product.id.slice(0, 8)}.png`;
      const uploadPath = await copyImageToUploads(sourcePath, fileName);
      
      if (uploadPath) {
        await storage.updateProduct(product.id, { imageUrl: uploadPath });
        productUpdateCount++;
        console.log(`✓ Updated product ${product.name} with demo image`);
      }
    }
    
    console.log('🎉 Demo image seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Profile photos updated: ${profileUpdateCount}/${users.length} users`);
    console.log(`   - Product images updated: ${productUpdateCount}/${Math.min(products.length, demoProductImages.length)} products`);
    
  } catch (error) {
    console.error('❌ Error seeding demo images:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoImages()
    .then(() => {
      console.log('Demo image seeding finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo image seeding failed:', error);
      process.exit(1);
    });
}