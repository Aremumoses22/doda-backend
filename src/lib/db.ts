import mongoose from "mongoose"

let isConnected = false

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log("[DB] Already connected to MongoDB")
    return
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined")
  }

  try {
    const connection = await mongoose.connect(uri, {
      dbName: "doda",
    })

    isConnected = connection.connections[0].readyState === 1
    console.log("[DB] ✅ Connected to MongoDB Atlas")

    // Log connection events
    mongoose.connection.on("error", (err) => {
      console.error("[DB] ❌ MongoDB connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] ⚠️  MongoDB disconnected")
      isConnected = false
    })

    mongoose.connection.on("reconnected", () => {
      console.log("[DB] 🔄 MongoDB reconnected")
      isConnected = true
    })
  } catch (error) {
    console.error("[DB] ❌ Failed to connect to MongoDB:", error)
    process.exit(1)
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  console.log("[DB] Disconnected from MongoDB")
}
