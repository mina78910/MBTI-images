# Firebase Security Rules案

以下の `ADMIN_UID` を管理者のGoogleログインUIDに置き換えてから、Firebase Consoleに貼り付けて公開してください。

## Cloud Firestore Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      let ADMIN_UID = 'AutvrLYLvOfLUHhSbnVSaQMe9AT2';
      return request.auth != null && request.auth.uid == ADMIN_UID;
    }

    match /materials/{materialId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Cloud Storage Rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      let ADMIN_UID = 'AutvrLYLvOfLUHhSbnVSaQMe9AT2';
      return request.auth != null && request.auth.uid == ADMIN_UID;
    }

    match /users/{userId}/images/{fileName} {
      allow read: if true;
      allow create, update: if isAdmin()
        && request.auth.uid == userId
        && request.resource.size <= 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if isAdmin() && request.auth.uid == userId;
    }
  }
}
```
