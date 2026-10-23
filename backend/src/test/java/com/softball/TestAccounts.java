package com.softball;

import com.softball.domain.model.AppUser;
import com.softball.domain.model.Player;
import com.softball.domain.model.Role;
import com.softball.domain.port.out.AppUserRepository;
import com.softball.domain.port.out.PlayerRepository;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.context.ApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.time.Instant;

/**
 * Stellt vor jedem Test sicher, dass der Superadmin {@code hung} existiert. Der Bootstrap legt
 * ihn nur beim Kontextstart an; viele Tests raeumen mit {@code playerRepository.deleteAll()}
 * auf, und das loescht ueber die Kaskade auch {@code app_user}. {@code @WithMockUser(username =
 * "hung")} traefe sonst keinen Account, und {@code CurrentUser.get()} wirft.
 */
public class TestAccounts implements BeforeEachCallback {

    public static final String SUPERADMIN = "hung";
    public static final String PASSWORD = "test"; // app.auth.password im Testprofil

    @Override
    public void beforeEach(final ExtensionContext context) {
        final ApplicationContext ctx = SpringExtension.getApplicationContext(context);
        final AppUserRepository users = ctx.getBean(AppUserRepository.class);
        if (users.findByUsername(SUPERADMIN).isPresent()) {
            return;
        }
        final Player player = ctx.getBean(PlayerRepository.class).save(new Player("Hung"));
        final AppUser user = new AppUser();
        user.setPlayerId(player.getId());
        user.setUsername(SUPERADMIN);
        user.setPasswordHash(ctx.getBean(PasswordEncoder.class).encode(PASSWORD));
        user.setRole(Role.SUPERADMIN);
        user.setCreatedAt(Instant.now());
        users.save(user);
    }
}
