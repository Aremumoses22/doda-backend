import "dotenv/config"
import app from "./app"
import { connectDB } from "./lib/db"
import { startReminderJobs } from "./jobs/reminders.job"

const PORT = parseInt(process.env.PORT || "5000", 10)

async function bootstrap() {
  await connectDB()
  app.listen(PORT, () => {
    console.log("Doda API running on port " + PORT)
    if (process.env.NODE_ENV !== "test") {
      startReminderJobs()
    }
  })
}

bootstrap()

process.on("SIGTERM", () => { process.exit(0) })
process.on("SIGINT",  () => { process.exit(0) })
