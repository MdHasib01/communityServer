import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";

const usersData = [
  {
    username: "alex_entrepreneur",
    email: "alex@example.com",
    fullName: "Alex Johnson",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "sarah_startup",
    email: "sarah@example.com",
    fullName: "Sarah Chen",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "mike_business",
    email: "mike@example.com",
    fullName: "Mike Rodriguez",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "emma_marketing",
    email: "emma@example.com",
    fullName: "Emma Thompson",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "david_saas",
    email: "david@example.com",
    fullName: "David Kim",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "lisa_ecommerce",
    email: "lisa@example.com",
    fullName: "Lisa Wang",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "james_sales",
    email: "james@example.com",
    fullName: "James Wilson",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2182975/pexels-photo-2182975.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "anna_finance",
    email: "anna@example.com",
    fullName: "Anna Kowalski",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "carlos_ideas",
    email: "carlos@example.com",
    fullName: "Carlos Martinez",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2379003/pexels-photo-2379003.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "rachel_growth",
    email: "rachel@example.com",
    fullName: "Rachel Green",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "tom_strategy",
    email: "tom@example.com",
    fullName: "Tom Anderson",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2182969/pexels-photo-2182969.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "sophia_tech",
    email: "sophia@example.com",
    fullName: "Sophia Lee",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1239287/pexels-photo-1239287.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "ryan_consulting",
    email: "ryan@example.com",
    fullName: "Ryan O'Connor",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2379006/pexels-photo-2379006.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "maya_innovation",
    email: "maya@example.com",
    fullName: "Maya Patel",
    password: "password123",
    avatar: "https://images.pexels.com/photos/1181685/pexels-photo-1181685.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    username: "kevin_leadership",
    email: "kevin@example.com",
    fullName: "Kevin Brown",
    password: "password123",
    avatar: "https://images.pexels.com/photos/2182974/pexels-photo-2182974.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

export async function seedUsers() {
  try {
    console.log("Seeding users...");
    
    // Check if users already exist
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`Users already exist (${existingCount} found). Skipping seed.`);
      return;
    }
    
    // Hash passwords and create users
    const usersWithHashedPasswords = await Promise.all(
      usersData.map(async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        return {
          ...userData,
          password: hashedPassword,
        };
      })
    );
    
    // Insert users
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Successfully seeded ${createdUsers.length} users`);
    
    return createdUsers;
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}

export { usersData };