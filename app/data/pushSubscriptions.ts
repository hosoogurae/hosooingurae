/** 브라우저 PushSubscription.toJSON()이 만드는 모양과 동일하게 맞춰서, 클라이언트에서
 * 받은 값을 그대로 저장 함수에 넘길 수 있게 합니다. */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}
