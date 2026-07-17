package com.softball.domain.port.out;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import com.softball.domain.model.WhatsappVote;
import java.util.List;

public interface WhatsappSender {
    WhatsappAccountStatus status();
    String qr();                         // null wenn verbunden
    List<WhatsappGroup> listGroups();
    String sendPoll(String groupId, String title, List<String> options, boolean allowMultipleAnswers, String message);
    List<WhatsappVote> fetchVotes(String msgId);
}
