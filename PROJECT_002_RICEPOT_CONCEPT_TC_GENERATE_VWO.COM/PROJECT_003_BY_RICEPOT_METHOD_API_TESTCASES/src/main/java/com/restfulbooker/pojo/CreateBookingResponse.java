package com.restfulbooker.pojo;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateBookingResponse {
    @JsonProperty("bookingid")
    private int bookingId;
    
    @JsonProperty("booking")
    private BookingPojo booking;

    public CreateBookingResponse() {
    }

    public CreateBookingResponse(int bookingId, BookingPojo booking) {
        this.bookingId = bookingId;
        this.booking = booking;
    }

    public int getBookingId() {
        return bookingId;
    }

    public void setBookingId(int bookingId) {
        this.bookingId = bookingId;
    }

    public BookingPojo getBooking() {
        return booking;
    }

    public void setBooking(BookingPojo booking) {
        this.booking = booking;
    }
}
