# Vue Offline Sync 🔄

A **Vue 3 composable** for **offline-first syncing**. Save data while offline and automatically sync it when back online.
Uses **IndexedDB** for offline storage.

## 🚀 Features

- Auto-sync when online
- Custom API endpoint
- Uses IndexedDB for offline storage
- Bulk or individual syncing

---

## 📦 Installation

```sh
npm install vue-offline-sync
```

## ⚡ Quick Start

### 1️⃣ Basic Usage
Below is the sample implementation
```vue

<script setup>
import {ref} from 'vue';
// 1. Import library
import {useOfflineSync} from 'vue-offline-sync';

const formData = ref({name: '', message: ''});

// 2. Initialize
const {state, saveOfflineData} = useOfflineSync({
  url: 'https://myapi.com/sync',
  // method: 'POST',    // optional 
  // headers: {Authorization: 'Bearer your-token'}, // optional
  // keyPath: 'syncId', // optional
  // bulkSync: false,   // optional
});

const submitData = async () => {
  if (!formData.value.name || !formData.value.message) return;

  // 3. Pass your data to this method.
  await saveOfflineData({name: formData.value.name, message: formData.value.message});

  formData.value = {name: '', message: ''};
};
</script>

<template>
  <div>
    <h2>Vue Offline Sync Example</h2>
    <p>Status: <strong>{{ state.isOnline ? 'Online' : 'Offline' }}</strong></p>

    <form @submit.prevent="submitData">
      <input v-model="formData.name" placeholder="Your Name" required/>
      <textarea v-model="formData.message" placeholder="Your Message" required></textarea>
      <button type="submit">Save</button>
    </form>
  </div>
</template>
```

### ⚙️ Options

| Option     | Type    | Required  | Default    | Description                                          |
|:-----------|:--------|:----------|:-----------|:-----------------------------------------------------|
| `url`      | String  | ✅ Yes     | undefined  | API endpoint to sync data                            |
| `method`   | String  | ❌ No      | "POST"     | HTTP method (e.g., "POST", "PUT", etc.)              |
| `headers`  | Object  | ❌ No      | {}         | Additional headers (e.g., authentication token)      |
| `keyPath`  | String  | ❌ No      | "id"       | The unique key for storing data in IndexedDB         |
| `bulkSync` | Boolean | ❌ No      | false      | Set to true if your API accepts batch sync requests  |

### 📡 States

| State               | Type          | Description                                  |
|:--------------------|---------------|:---------------------------------------------|
| `state.isOnline`    | Boolean       | `true` when online, `false` when offline     |
| `state.offlineData` | Array<Object> | Data stored in IndexedDB during offline mode |

### 🔄 Methods

| Method                  | Description                                                         |
|:------------------------|:--------------------------------------------------------------------|
| saveOfflineData(object) | Saves data to IndexedDB when offline, or syncs directly when online |
| syncOfflineData()       | Manually triggers syncing of offline data                           |

<br />

### 📌 Bulk vs Individual Syncing
By default, this is set to false.

#### 📥 Bulk Sync (bulkSync: true)

✔ Sends all offline data as one request<br />
✔ Recommended for APIs that support bulk inserts

**Example Requests**

```json
[
  { "name": "Name A", "message": "Hello!" },
  { "name": "Name B", "message": "Hey there!" }
]
```

#### 📤 Individual Sync (bulkSync: false)

✔ Sends each offline entry separately<br />
✔ Recommended for APIs that only accept single requests

**Example Requests**

```json
{ "name": "Name A", "message": "Hello!" }
```


