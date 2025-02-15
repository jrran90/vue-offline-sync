# Vue Offline Sync 🔄

A **Vue 3 composable** for **offline-first syncing**. Save data while offline and automatically sync it when back
online.
Uses **IndexedDB** for offline storage.

## 🚀 Features

- Auto-sync when online
- Custom API endpoint
- Uses IndexedDB for offline storage
- Bulk or individual syncing
- Configurable retry policy for failed requests

---

## 📦 Installation

```sh
npm install vue-offline-sync
```

## ⚡ Quick Start

### 1️⃣ Basic Usage

Here’s a basic implementation example

```vue

<script setup>
import {ref} from 'vue';
// 1. Import library
import {useOfflineSync} from 'vue-offline-sync';

const formData = ref({name: '', message: ''});

// 2. Initialize
const {state, saveOfflineData} = useOfflineSync({
  url: 'https://myapi.com/sync',
  // method: 'POST',                                  // optional 
  // headers: {Authorization: 'Bearer your-token'},   // optional
  // bulkSync: false,                                 // optional
  // uniqueKeys: ['name'],                            // optional
  // retryPolicy: { maxAttempts: 3, delayMs: 1000 },  // optional
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

| Option        | Type     | Required | Default                               | Description                                                                                                                                                |
|:--------------|:---------|:---------|:--------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`         | String   | ✅ Yes    | `undefined`                           | API endpoint to sync data                                                                                                                                  |
| `method`      | String   | ❌ No     | "POST"                                | HTTP method (e.g., "POST", "PUT", etc.)                                                                                                                    |
| `headers`     | Object   | ❌ No     | {}                                    | Additional headers (e.g., authentication token)                                                                                                            |
| `bulkSync`    | Boolean  | ❌ No     | false                                 | Set to true if your API accepts batch sync requests                                                                                                        |
| `uniqueKeys`  | String[] | ❌ No     | `undefined`                           | Specifies the columns that must have unique values across all entries. If any of the defined columns contain duplicate values, the entry will be rejected. |
| `retryPolicy` | Object   | ❌ No     | ```{maxAttempts: 1, delayMs: 1000}``` | Configures automatic retries for failed requests. See **[Retry Policy](#-retry-policy)** below.                                                            |

### 📡 States

| State                    | Type          | Description                                                                                       |
|:-------------------------|---------------|:--------------------------------------------------------------------------------------------------|
| `state.isOnline`         | Boolean       | `true` when online, `false` when offline                                                          |
| `state.offlineData`      | Array<Object> | Data stored in IndexedDB during offline mode                                                      |
| `state.isSyncInProgress` | Boolean       | Can be used to indicate a loading state in the UI, informing the user that syncing is in progress |

### 🔄 Methods

| Method                  | Description                                                         |
|:------------------------|:--------------------------------------------------------------------|
| saveOfflineData(object) | Saves data to IndexedDB when offline, or syncs directly when online |
| syncOfflineData()       | Manually triggers syncing of offline data                           |

### 🔄 Retry Policy

The `retryPolicy` option allows configuring **automatic retries** for failed API requests.

| Property      | Type   | Default | Description                                    |
|---------------|--------|---------|------------------------------------------------|
| `maxAttempts` | Number | `1`     | Maximum number of retries before failing       |
| `delayMs`     | Number | `1000`  | Delay (in milliseconds) between retry attempts |

**Example Usage:**

```js
const {state, saveOfflineData} = useOfflineSync({
    url: 'https://myapi.com/sync',
    retryPolicy: {
        maxAttempts: 5,
        delayMs: 2000,
    }
});
```

> 💡 If a request fails, it will retry up to 5 times with a **2-second delay** between each attempt.

<br />

### 📌 Bulk vs Individual Syncing

> **Note:** The individual syncing is being used by default.

#### 📥 Bulk Sync (bulkSync: true)

✔ Sends all offline data as one request<br />
✔ Recommended for APIs that support bulk inserts

**Example Requests**

```json
[
  {
    "name": "Name A",
    "message": "Hello!"
  },
  {
    "name": "Name B",
    "message": "Hey there!"
  }
]
```

#### 📤 Individual Sync (bulkSync: false)

✔ Sends each offline entry separately<br />
✔ Recommended for APIs that only accept single requests

**Example Requests**

```json
{
  "name": "Name A",
  "message": "Hello!"
}
```
