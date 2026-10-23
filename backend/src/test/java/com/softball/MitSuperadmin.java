package com.softball;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.test.context.support.WithMockUser;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Angemeldet als der echte Account {@code hung} (SUPERADMIN); der Account wird bei Bedarf neu angelegt. */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@WithMockUser(username = "hung", roles = "SUPERADMIN")
@ExtendWith(TestAccounts.class)
public @interface MitSuperadmin {
}
