<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const meowId = route.params.id;
const chatMessage = ref("");
const meowDetail = ref<Meow>({
  id: "",
  occupation: "",
  description: "",
});

interface ChatMessage {
  role: string;
  content: string;
}

interface Meow {
  id: string;
  occupation: string;
  description: string;
}

const getMeowDetail = async () => {
  const response = await fetch(
    `http://localhost:3000/api/v1/meowchan/${meowId}`
  );
  const data = await response.json();
  meowDetail.value = data;
};

const sendChatRequest = async () => {
  chatHistory.value.push({ role: "user", content: chatMessage.value });
  // Empty the chatMessage
  chatMessage.value = "";

  const response = await fetch(
    `http://localhost:3000/api/v1/meowchan/${meowId}/chat`,
    {
      method: "POST",
      body: JSON.stringify({
        messages: chatHistory.value,
      }),
    }
  );

  // stream response
  (async () => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let content = "";
    chatHistory.value.push({ role: "assistant", content });
    while (true) {
      const result = await reader?.read();
      if (result?.done) break;
      const text = decoder.decode(result?.value, { stream: true });
      content += text;
      chatHistory.value[chatHistory.value.length - 1]!.content = content;
    }
  })();
};

const escapeHtml = (html: string) => {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/ /g, "&nbsp;")
    .replace(/\n/g, "<br>");
};

const chatHistory = ref<ChatMessage[]>([]);

onMounted(() => {
  getMeowDetail();
});
</script>

<template>
  <div class="greetings">
    <h1>{{ meowDetail.id }} as {{ meowDetail.occupation }}</h1>
    <p>{{ meowDetail.description }}</p>
    <!-- a chat textarea here -->
    <textarea
      v-model="chatMessage"
      placeholder="Ask MeowGPT a question"
      class="chat-textarea"
    ></textarea>
    <button @click="sendChatRequest" class="send-button">Send</button>
    <!-- a chat history here -->
    <div v-for="message in chatHistory" class="chat-message">
      <!-- <p v-html="message.content"></p>
      -->

      <!-- content may include HTML tags, we need to escape them -->
      <div v-html="escapeHtml(message.content)"></div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
}

.chat-textarea {
  background-color: #000;
  color: #fff;
  width: 100%;
  height: 100px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.send-button {
  padding: 10px 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #000;
  color: #fff;
}

.send-button:hover {
  background-color: #333;
}

.send-button:active {
  background-color: #222;
}

.send-button:focus {
  outline: none;
}

.send-button:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
}

.chat-message {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #000;
  color: #fff;
}
</style>
