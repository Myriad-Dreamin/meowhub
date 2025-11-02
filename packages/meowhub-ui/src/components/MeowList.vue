<script setup lang="ts">
import { ref, onMounted } from "vue";
import router from "../router";

interface Meow {
  id: string;
  occupation: string;
}

const meowList = ref<Meow[]>([]);

const getMeowList = async () => {
  const response = await fetch("http://localhost:3000/api/v1/meowchan/list");
  const data = await response.json();
  meowList.value = data.items;
};

onMounted(() => {
  getMeowList();
});

defineProps<{}>();
</script>

<template>
  <div class="greetings">
    <h1>MeowList</h1>
    <ul>
      <!-- route to /meow/:id -->
      <li
        v-for="meow in meowList"
        :key="meow.id"
        @click="router.push(`/meow/${meow.id}`)"
      >
        {{ meow.id }} as {{ meow.occupation }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
