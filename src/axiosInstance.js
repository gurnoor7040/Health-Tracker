import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://health-tracker-x1ng.onrender.com/",
  withCredentials: true,
});

export default axiosInstance;