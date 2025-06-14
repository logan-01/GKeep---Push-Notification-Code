import { Expo, ExpoPushTicket, ExpoPushReceiptId } from "expo-server-sdk";
import { admin, database, firestore, goatsRef } from "../lib/firebase/config";

async function getExpoTokens(): Promise<string[]> {
  try {
    const usersCollection = firestore.collection("users");
    const usersSnapshot = await usersCollection.get();
    const tokensSet = new Set<string>();
    // const tokenRaw: string[] = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData && Array.isArray(userData.expoPushTokens)) {
        userData.expoPushTokens.forEach((token: string) => {
          tokensSet.add(token);
          // tokenRaw.push(token);
        });
      }
    });

    const tokensArray = Array.from(tokensSet);
    // console.log("Expo Push Tokens:", tokensArray);
    return tokensArray;
  } catch (error) {
    console.error("Error retrieving tokens:", error);
    return [];
  }
}

async function storeNotification(title: string, body: string) {
  try {
    const parseTitle = title.replace(/^\S+\s+/, "");
    const type = parseTitle === "Overheating Alert!" ? "danger" : "normal";

    await firestore.collection("notifications").add({
      title: parseTitle,
      body,
      type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // Store server timestamp
    });
    console.log("Notification stored in Firestore");
  } catch (error) {
    console.error("Error storing notification:", error);
  }
}

// Create a new Expo SDK client
let expo = new Expo({ useFcmV1: true });

async function sendPushNotification(title: string, body: string) {
  const tokenArray: string[] = await getExpoTokens();
  if (tokenArray.length === 0) return;

  let messages = [];

  for (let token of tokenArray) {
    //Check Token if a valid Expo Token
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Push token ${token} is not a valid Expo push token`);
      continue;
    }

    //Send the actual notification
    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      //   data: { withSome: "data" },
    });
  }

  //   Sending Notification in Batch
  let chunks = expo.chunkPushNotifications(messages);
  let tickets: ExpoPushTicket[] = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  // Verfied if Notification is send succesfully
  let receiptIds: ExpoPushReceiptId[] = [];
  for (let ticket of tickets) {
    if (ticket.status === "ok") {
      receiptIds.push(ticket.id);
    }
  }

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log(receipts);

      for (let receiptId in receipts) {
        let { status, details } = receipts[receiptId];
        if (status === "ok") {
          continue;
        } else if (status === "error") {
          console.error(
            `There was an error sending a notification: ${
              (details as any).error
            }`
          );
          if (details && "error" in details) {
            console.error(
              `The error code is ${(details as { error: string }).error}`
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Store notification in Firestore after successfully sending
  // await storeNotification(title, body);
}

const lastGoatStates: Record<
  string,
  { isInsideFence: boolean; isInsideHouse: boolean }
> = {};

// Load initial states (optional, useful for persisting between restarts)
async function loadLastStates() {
  const snapshot = await database.ref("goatsLastState").once("value");
  const val = snapshot.val();
  if (val) {
    Object.assign(lastGoatStates, val);
  }
}
loadLastStates();

// Save updated last states back to DB (optional persistence)
function saveLastStates() {
  database.ref("goatsLastState").set(lastGoatStates);
}

// Watch for changes to each goat (you could also use .on('value') for bulk updates)
export const pushNotificationListener = () => {
  goatsRef.on("child_changed", (snapshot) => {
    const goatId = snapshot.key as string;
    const data = snapshot.val();

    // Make sure fields exist
    if (
      typeof data.isInsideFence !== "boolean" ||
      typeof data.isInsideHouse !== "boolean"
    ) {
      return;
    }

    const previousState = lastGoatStates[goatId] || {
      isInsideFence: data.isInsideFence, // default to current to avoid false positives
      isInsideHouse: data.isInsideHouse,
    };

    // Only notify if there's a real change
    if (data.isInsideFence !== previousState.isInsideFence) {
      const status = data.isInsideFence
        ? "entered the fence"
        : "left the fence";
      sendPushNotification(
        `${data.name} (${goatId})`,
        `${data.name} (${goatId}) ${status}.`
      );
    }

    if (data.isInsideHouse !== previousState.isInsideHouse) {
      const status = data.isInsideHouse
        ? "entered the house"
        : "left the house";
      sendPushNotification(
        `${data.name} (${goatId})`,
        `${data.name} (${goatId}) ${status}.`
      );
    }

    // Update memory state
    lastGoatStates[goatId] = {
      isInsideFence: data.isInsideFence,
      isInsideHouse: data.isInsideHouse,
    };

    // Optionally save to DB
    saveLastStates();
  });
};
