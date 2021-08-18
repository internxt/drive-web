import axios from 'axios';

async function fetchLimit(): Promise<number> {
  const response = await axios.get('/api/limit');

  return response.data.maxSpaceBytes;
}

const limitService = {
  fetchLimit
};

export default limitService;