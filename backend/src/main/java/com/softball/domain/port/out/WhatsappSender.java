package com.softball.domain.port.out;

import com.softball.domain.model.WhatsappAccountStatus;
import com.softball.domain.model.WhatsappGroup;
import java.util.List;

public interface WhatsappSender {
    WhatsappAccountStatus status();
    String qr();                         // null wenn verbunden
    List<WhatsappGroup> listGroups();
    void sendPoll(String groupId, String title, List<String> options, boolean allowMultipleAnswers, String message);
}
