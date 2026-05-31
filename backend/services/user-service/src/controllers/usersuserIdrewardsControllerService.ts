// Re-export from the main controller file so OAS Tools can find it
// OAS Tools derives controller name from path: /users/{userId}/rewards → usersuserIdrewardsController
export { listRewards } from './usersrewardsmilestoneclaimControllerService';
