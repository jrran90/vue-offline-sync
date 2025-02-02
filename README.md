# Vue Offline Sync 🔄

A Vue 3 component for **offline-first syncing**. Save data while offline and sync it automatically when back online.
Uses **IndexedDB** for storage.

## 🚀 Features

- Auto-sync when online
- Custom API endpoint
- Uses IndexedDB for offline storage

---

## 📦 Installation

```sh
npm install vue-offline-sync
```

## ⚡ Quick Start

### 1️⃣ Basic Usage

```vue

<script setup>
import {ref} from 'vue';
import VueOfflineSync from 'vue-offline-sync';

const offlineSync = ref(null);
const formData = ref({name: '', message: ''});

const submitData = async () => {
  if (!formData.value.name || !formData.value.message) return;

  // Call saveOfflineData
  await offlineSync.value.saveOfflineData({
    name: formData.value.name,
    message: formData.value.message
  });

  formData.value = {name: '', message: ''};
};
</script>

<template>
  <div>
    <h2>Vue Offline Sync Example</h2>
    <p>Status: <strong>{{ offlineSync?.state?.isOnline ? 'Online' : 'Offline' }}</strong></p>

    <form @submit.prevent="submitData">
      <input v-model="formData.name" placeholder="Your Name" required/>
      <textarea v-model="formData.message" placeholder="Your Message" required></textarea>
      <button type="submit">Save</button>
    </form>

    <VueOfflineSync ref="offlineSync" syncUrl="https://myapi.com/sync"/>
  </div>
</template>
```

### ⚙️ Props

| Props      | Type    | Required | Default   | Description                                                                                                         |
|:-----------|:--------|:---------|:----------|:--------------------------------------------------------------------------------------------------------------------|
| `ref`      | String  | Yes      | undefined | This will expose the methods (saveOfflineData, syncOfflineData) that need to be accessed from the parent component. |
| `syncUrl`  | String  | Yes      | undefined | API endpoint to sync data                                                                                           |
| `keyPath`  | String  | No       | id        | Defines which property of the object you want to address in your index.                                             |
| `headers`  | Object  | No       |           | Necessary when your API requires token.                                                                             |
| `method`   | String  | No       | POST      | API method i.e., POST, PUT, GET, etc.                                                                               |
| `bulkSync` | Boolean | No       | false     | When your API's request payload accepts array of object or bulk.                                                    |

### States

| State               | Description                                           |
|:--------------------|:------------------------------------------------------|
| `state.isOnline`    | Check status if online or offline                     |
| `state.offlineData` | Get stored data from indexedDB during offline period. |

### 🔄 Methods

| Method                  | Description                          |
|:------------------------|:-------------------------------------|
| saveOfflineData(object) | Saves data to IndexedDB when offline |

