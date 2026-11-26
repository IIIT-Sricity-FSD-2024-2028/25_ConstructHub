import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, json } from '../../store/helpers';

/** Direct messages: the server returns only conversations the signed-in user is part of. */
const messagesAdapter = createEntityAdapter();

export const fetchMessages = apiThunk('messages/fetchAll', () => apiRequest('messages'));
export const sendMessage = apiThunk('messages/send', (data) => apiRequest('messages', json('POST', data)));

const messagesSlice = createSlice({
  name: 'messages',
  initialState: listState(messagesAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchMessages, messagesAdapter);
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      if (action.payload?.id) messagesAdapter.addOne(state, action.payload);
    });
  },
});

export default messagesSlice.reducer;

export const { selectAll: selectAllMessages } = messagesAdapter.getSelectors((state) => state.messages);

const sender = (m) => m.senderId || m.from;
const receiver = (m) => m.receiverId || m.to;

/** The conversation between the signed-in user and one contact, oldest first. */
export const selectConversation = createSelector(
  [selectAllMessages, (_state, me) => me, (_state, _me, other) => other],
  (messages, me, other) => messages.filter((m) =>
    (sender(m) === me && receiver(m) === other) || (sender(m) === other && receiver(m) === me)),
);
