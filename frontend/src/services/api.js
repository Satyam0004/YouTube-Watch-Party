const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');

export async function createRoom(username, initialVideoId) {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, initialVideoId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create room');
  }

  return response.json();
}

export async function joinRoom(roomId, username) {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to join room');
  }

  return response.json();
}

export async function getRoomDetails(roomId, userId) {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}?userId=${userId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch room details');
  }
  return response.json();
}

export async function getParticipants(roomId) {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/participants`);
  if (!response.ok) {
    throw new Error('Failed to fetch participants');
  }
  return response.json();
}
