package com.kumarsatyam.youtubewatchparty.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("YouTube Watch Party API")
                        .version("1.0.0")
                        .description("Production REST API and WebSockets documentation for real-time synchronized YouTube Watch Party System.")
                        .contact(new Contact()
                                .name("Kumar Satyam")
                                .url("https://github.com/Satyam0004/YouTube-Watch-Party")))
                .servers(List.of(
                        new Server().url("https://youtube-watch-party-o8ti.onrender.com").description("Production Render Server"),
                        new Server().url("http://localhost:" + serverPort).description("Local Development Server")
                ));
    }
}
