import { createMemoryHistory, createRouter } from 'vue-router'

import MeowList from './components/MeowList.vue'
import MeowDetail from './components/MeowDetail.vue'

const routes = [
    { path: '/', component: MeowList },
    { path: '/meow/:id', component: MeowDetail },
]

const router = createRouter({
    history: createMemoryHistory(),
    routes,
})

export default router