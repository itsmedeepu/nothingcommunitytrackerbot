require("dotenv").config();
const express = require("express");
const axios = require("axios");
const server = express();
const port = 3000 || process.env.PORT;

// get bot instance
const { getBotInstance } = require("./botconfig/botconfig");
const bot = getBotInstance();
server.use(express.json());

// Route to check if the bot is running
server.get("/test", (req, res) => {
  console.log("bot running");
  res.send("Bot is running!");
});

// Route to process bot updates
server.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start server
server.listen(port, () => {
  console.log("Bot up and running successfully");
});

// Sample command handler for /test command
bot.onText(/\/test/, async (msg) => {
  console.log("Test command received");
  bot.sendMessage(msg.chat.id, "Bot is alive ");
  console.log(msg.chat.id);
});

bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Hii Im Nothing's community tracker bot . I will fetch latest news from community .Add me to your group for daily updates"
  );
});

/** Utility Functions **/

// Utility to fetch news from the API
const fetchNewsFromAPI = async () => {
  try {
    const response = await axios.get("https://nothing.community/api/news");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching news from API:", error);
    throw new Error("Failed to fetch news.");
  }
};

// Utility to format date into "Mon DD YYYY HH:MM" format
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "short", // 'Mon'
    year: "numeric", // '2024'
    month: "short", // 'Sep'
    day: "2-digit", // '05'
    hour: "2-digit", // '10'
    minute: "2-digit", // '45'
    hour12: false, // 24-hour format
  });
};

// Utility to send a single news item to the chat
const sendNewsItem = async (chat_id, newsItem) => {
  const {
    title,
    abstract: description,
    createdAt,
    link: communityLink,
    imageUrl,
  } = newsItem.attributes;

  // Format the date
  const formattedDate = formatDate(createdAt) + " IST";

  // Create the message caption
  const caption = `📰 *Title:* ${title}\n\n*Description:* ${description}\n\n📅 *Posted on:* ${formattedDate}\n\n🔗 [Read More](${communityLink})`;

  // Send the image with the caption, or just text if no image is available
  if (imageUrl) {
    await bot.sendPhoto(chat_id, imageUrl, {
      caption: caption,
      parse_mode: "Markdown",
    });
  } else {
    await bot.sendMessage(chat_id, caption, { parse_mode: "Markdown" });
  }
};

// Fetch and send the latest news
const fetchAndSendNews = async (chat_id) => {
  try {
    const newsArticles = await fetchNewsFromAPI();

    // Loop through each news article and send them one by one
    for (const newsItem of newsArticles) {
      await sendNewsItem(chat_id, newsItem);

      // Add a slight delay between sending each message to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
    }
  } catch (error) {
    bot.sendMessage(chat_id, "Failed to fetch news. Please try again later.");
  }
};

const chat_id = 7273374229; // Replace with actual chat/group ID

//fetch latest news/ todays news
// Utility to fetch today's news and send it if available
const fetchTodayNews = async (chat_id) => {
  try {
    // Fetch all news from the API
    const newsArticles = await fetchNewsFromAPI();

    // Get today's date in YYYY-MM-DD format (ignoring time)
    const today = new Date().toISOString().split("T")[0]; // e.g., '2024-09-05'
    console.log(today);

    // Filter the news articles to include only those created today
    const todaysNews = newsArticles.filter((newsItem) => {
      const newsDate = new Date(newsItem.attributes.createdAt)
        .toISOString()
        .split("T")[0];
      return newsDate === today;
    });

    if (todaysNews.length === 0) {
      console.log("No news available for today.");
      return;
    }
    for (const newsItem of todaysNews) {
      await sendNewsItem(chat_id, newsItem);

      // Add a slight delay between sending each message to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
    }
  } catch (error) {
    console.error("Error fetching today's news:", error);
    bot.sendMessage(
      chat_id,
      "Failed to fetch today's news. Please try again later."
    );
  }
};

setInterval(() => {
  console.log("Fetching today's news...");
  fetchTodayNews(chat_id);
}, 60 * 1 * 1000);

bot.onText("/news", () => fetchAndSendNews(chat_id));
