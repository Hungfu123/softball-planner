package com.softball.application;

import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import com.softball.domain.port.out.WhatsappSender;
import com.softball.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappPollServiceSendNowTest {

    private final WhatsappPollRepository repository = mock(WhatsappPollRepository.class);
    private final WhatsappSender sender = mock(WhatsappSender.class);
    private final WhatsappPollService service = new WhatsappPollService(repository, sender);

    private WhatsappPoll poll() {
        final WhatsappPoll p = new WhatsappPoll();
        p.setId(1L);
        p.setGroupId("123@g.us");
        p.setTitle("Wer kommt zum Training?");
        p.setOptions(List.of("Ja", "Nein"));
        return p;
    }

    @Test
    void sendNow_stampsMessageIdAndSentAt() {
        final WhatsappPoll p = poll();
        when(repository.findById(1L)).thenReturn(Optional.of(p));
        when(sender.sendPoll(any(), any(), any(), anyBoolean(), any())).thenReturn("msg-42");
        when(repository.save(any(WhatsappPoll.class))).thenAnswer(i -> i.getArgument(0));

        service.sendNow(1L);

        assertThat(p.getLastSentMessageId()).isEqualTo("msg-42");
        assertThat(p.getLastSentAt()).isNotNull();
        verify(repository).save(p);
    }

    @Test
    void sendNow_throwsWhenPollMissing() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.sendNow(9L)).isInstanceOf(ResourceNotFoundException.class);
    }
}
